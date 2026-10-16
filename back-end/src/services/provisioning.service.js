'use strict';

const crypto = require('crypto');
const { maxId } = require('../utils/maxId');
const dataStore = require('../store/dataStore');
const organizationService = require('./organization.service');
const subscriptionService = require('./subscription.service');
const planService = require('./subscriptionPlan.service');
const wardService = require('./ward.service');
const inventoryService = require('./inventory.service');
const billingService = require('./billing.service');
const authService = require('./auth.service');
const { hashPassword } = require('../utils/password');
const {
  DEFAULT_DEPARTMENTS,
  DEFAULT_SERVICES,
  DEFAULT_INVENTORY_ITEMS,
} = require('../config/defaultClinicalCatalog');
const { parseEmail } = require('../utils/emailIdentity');

/**
 * Provisioning Engine (tasks.md §6) — the one place a new tenant gets
 * fully stood up. Every step is logged to `provisioningLog` individually
 * so a Platform Super User can see exactly what was configured (and, if a
 * step fails, exactly where it stopped) — this is the audit trail tasks.md
 * §6 implies by listing "Generate Organization Configuration" as its own
 * responsibility, not just an implementation detail of "Create Organization".
 */
function logStep(organizationId, step, status, message) {
  dataStore.provisioningLog.push({
    id:
      maxId(dataStore.provisioningLog, 'id') + 1 || 1,
    organization_id: Number(organizationId),
    step,
    status,
    message,
    created_at: new Date().toISOString(),
  });
}

/**
 * Every newly provisioned hospital used to start with zero wards, zero
 * departments and zero inventory — nothing forced a standard baseline, so
 * each org's data shape was whatever got typed in by hand later (and
 * nothing ever got typed in for a demo/test org, since there was no UI to
 * do it). Seeds the standard 6 department/ward pairs + starter inventory
 * from config/defaultClinicalCatalog.js; Admin can add/remove from here
 * afterwards via the wardAdmin/inventoryCatalog endpoints.
 */
function seedDefaultClinicalBaseline(organizationId, hospitalId) {
  DEFAULT_DEPARTMENTS.forEach(({ wardName, defaultBeds }) => {
    // createWard() creates the matching bed records itself when
    // total_beds is set — no need to also loop-create them here.
    wardService.createWard({
      ward_name: wardName,
      total_beds: defaultBeds,
      description: `${wardName} — default baseline`,
      organization_id: organizationId,
      hospital_id: hospitalId,
    });
  });

  // Seed the billable services catalog first, then link each consumable
  // inventory item to the service it should be charged under (by name), so
  // "log supply usage" posts a charge with the right service — not a
  // catch-all "Consultation Fee".
  const serviceIdByName = {};
  DEFAULT_SERVICES.forEach((svc) => {
    const created = billingService.createService({
      service_name: svc.service_name,
      category: svc.category,
      base_cost: svc.base_cost,
      organization_id: organizationId,
      hospital_id: hospitalId,
    });
    serviceIdByName[svc.service_name] = created.service_id;
  });

  DEFAULT_INVENTORY_ITEMS.forEach((item) => {
    const { billable_service, ...rest } = item;
    inventoryService.createItem({
      ...rest,
      service_id: billable_service ? serviceIdByName[billable_service] || null : null,
      organization_id: organizationId,
      hospital_id: hospitalId,
    });
  });
}

function generateApiKey(organizationId, label) {
  const newKey = {
    api_key_id:
      maxId(dataStore.apiKeys, 'api_key_id') + 1 || 1,
    organization_id: Number(organizationId),
    label: label || 'Default',
    key: `fed_live_${crypto.randomBytes(18).toString('hex')}`,
    created_at: new Date().toISOString(),
    revoked_at: null,
  };
  dataStore.apiKeys.push(newKey);
  return newKey;
}

/**
 * payload: { name, email_domain?, contact, specialties, emergency_available,
 *            admin_name, admin_email, admin_password, plan_id, modules? }
 * `modules`, if omitted, defaults to the plan's included_modules.
 * `email_domain`, if omitted, is suggested from the name. The admin's login
 * must be <name>.admin@<email_domain> — the unified login page reads the
 * actor from the tag and the hospital from the domain.
 */
function provision(payload) {
  const plan = planService.findById(payload.plan_id);
  if (!plan) return { error: 'PLAN_NOT_FOUND' };

  let emailDomain;
  if (payload.email_domain) {
    const checked = organizationService.validateEmailDomain(
      payload.email_domain,
    );
    if (checked.error) return checked;
    emailDomain = checked.domain;
  } else {
    emailDomain = organizationService.suggestEmailDomain(payload.name);
  }
  const adminEmail = parseEmail(payload.admin_email);
  if (
    !adminEmail ||
    adminEmail.actor !== 'Admin' ||
    adminEmail.domain !== emailDomain
  ) {
    return { error: 'ADMIN_EMAIL_MISMATCH', email_domain: emailDomain };
  }

  const organization = organizationService.create({
    name: payload.name,
    email_domain: emailDomain,
    contact: payload.contact,
    specialties: payload.specialties,
    emergency_available: payload.emergency_available,
  });
  logStep(
    organization.organization_id,
    'CREATE_ORGANIZATION',
    'DONE',
    `Organization "${organization.name}" created`,
  );

  const hospital = organizationService.createHospital(
    organization.organization_id,
    {
      name: `${organization.name} — Main Campus`,
      city: payload.city || null,
      address: payload.contact && payload.contact.address,
      phone: payload.contact && payload.contact.phone,
      is_primary: true,
    },
  );
  logStep(
    organization.organization_id,
    'GENERATE_CONFIGURATION',
    'DONE',
    `Primary hospital "${hospital.name}" created`,
  );

  const { subscription } = subscriptionService.setPlan(
    organization.organization_id,
    plan.plan_id,
  );
  logStep(
    organization.organization_id,
    'ALLOCATE_QUOTAS',
    'DONE',
    `Subscribed to "${plan.name}" — quotas allocated`,
  );

  // Resource-level entitlements (beds / seats / terminals — tasks.md §6/§7).
  // `module_resources` shape: { MODULE_CODE: { RESOURCE_CODE: quantity } }.
  if (payload.module_resources && typeof payload.module_resources === 'object') {
    const stored = organizationService.setResourceQuantities(
      organization.organization_id,
      payload.module_resources,
    );
    const resourceSummary = Object.keys(stored)
      .map(
        (mod) =>
          `${mod}[` +
          Object.keys(stored[mod])
            .map((res) => `${res}:${stored[mod][res]}`)
            .join(', ') +
          ']',
      )
      .join('  ');
    logStep(
      organization.organization_id,
      'ALLOCATE_RESOURCES',
      'DONE',
      `Resource entitlements: ${resourceSummary || 'none'}`,
    );
  }

  const adminUser = {
    user_id:
      maxId(dataStore.users, 'user_id') + 1 || 101,
    name: payload.admin_name,
    email: payload.admin_email,
    password_hash: hashPassword(payload.admin_password),
    demo_password: payload.admin_password,
    role_id: 5, // Admin — the organization's owner/super user, above HOM (see utils/roles.js ROLE_ID_TO_NAME)
    organization_id: organization.organization_id,
    hospital_id: hospital.hospital_id,
    created_at: new Date().toISOString(),
  };
  dataStore.users.push(adminUser);
  authService.registerDemoPassword(adminUser.email, payload.admin_password);
  logStep(
    organization.organization_id,
    'CREATE_DEFAULT_ADMIN',
    'DONE',
    `Default admin account created (${adminUser.email})`,
  );

  seedDefaultClinicalBaseline(organization.organization_id, hospital.hospital_id);
  logStep(
    organization.organization_id,
    'SEED_DEFAULT_WARDS',
    'DONE',
    `Seeded ${DEFAULT_DEPARTMENTS.length} default department/ward pairs`,
  );
  logStep(
    organization.organization_id,
    'SEED_DEFAULT_SERVICES',
    'DONE',
    `Seeded ${DEFAULT_SERVICES.length} billable clinical services`,
  );
  logStep(
    organization.organization_id,
    'SEED_DEFAULT_INVENTORY',
    'DONE',
    `Seeded ${DEFAULT_INVENTORY_ITEMS.length} default inventory items (consumables linked to services)`,
  );

  const apiKey = generateApiKey(
    organization.organization_id,
    'Provisioning default key',
  );
  logStep(
    organization.organization_id,
    'GENERATE_API_KEY',
    'DONE',
    'API key generated',
  );

  return {
    organization,
    hospital,
    subscription,
    admin: {
      user_id: adminUser.user_id,
      name: adminUser.name,
      email: adminUser.email,
    },
    apiKey,
  };
}

/**
 * [status, message] for each { error } provision() and
 * organizationService.changeEmailDomain() can return, shared by the platform
 * and marketplace controllers.
 */
function errorResponseFor(result) {
  switch (result.error) {
    case 'PLAN_NOT_FOUND':
      return [400, 'Unknown subscription plan'];
    case 'INVALID_EMAIL_DOMAIN':
      return [
        400,
        'Email domain must look like yourhospital.com and cannot be a public mail provider',
      ];
    case 'EMAIL_DOMAIN_TAKEN':
      return [409, 'That email domain is already used by another hospital'];
    case 'ADMIN_EMAIL_MISMATCH':
      return [
        400,
        `Admin email must look like name.admin@${result.email_domain || 'yourhospital.com'}`,
      ];
    case 'NOT_FOUND':
      return [404, 'Organization not found'];
    default:
      return [400, result.error || 'Bad Request'];
  }
}

module.exports = {
  provision,
  errorResponseFor,
  generateApiKey,
  logStep,
  seedDefaultClinicalBaseline,
};
