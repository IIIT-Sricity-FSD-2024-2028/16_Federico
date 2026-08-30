'use strict';

const crypto = require('crypto');
const dataStore = require('../store/dataStore');
const organizationService = require('./organization.service');
const subscriptionService = require('./subscription.service');
const planService = require('./subscriptionPlan.service');
const wardService = require('./ward.service');
const inventoryService = require('./inventory.service');
const billingService = require('./billing.service');
const { hashPassword } = require('../utils/password');
const {
  DEFAULT_DEPARTMENTS,
  DEFAULT_SERVICES,
  DEFAULT_INVENTORY_ITEMS,
} = require('../config/defaultClinicalCatalog');
const { MODULE_CODES } = require('../utils/tenant');

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
      dataStore.provisioningLog.length > 0
        ? Math.max(...dataStore.provisioningLog.map((l) => l.id)) + 1
        : 1,
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
      dataStore.apiKeys.length > 0
        ? Math.max(...dataStore.apiKeys.map((k) => k.api_key_id)) + 1
        : 1,
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
 * payload: { name, contact, specialties, emergency_available, admin_name,
 *            admin_email, admin_password, plan_id, modules? }
 * `modules`, if omitted, defaults to the plan's included_modules.
 */
function provision(payload) {
  const plan = planService.findById(payload.plan_id);
  if (!plan) return { error: 'PLAN_NOT_FOUND' };

  const organization = organizationService.create({
    name: payload.name,
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

  const chosenModules = (payload.modules && payload.modules.length) ? payload.modules : (plan && plan.included_modules && plan.included_modules.length ? plan.included_modules : MODULE_CODES);
  const enabledModules = organizationService.setModuleFlags(
    organization.organization_id,
    chosenModules,
    payload.module_instances || {},
  );
  const instanceSummary = enabledModules
    .map((code) => `${code}×${(payload.module_instances || {})[code] || 1}`)
    .join(', ');
  logStep(
    organization.organization_id,
    'ENABLE_MODULES',
    'DONE',
    `Enabled services: ${instanceSummary || 'none'}`,
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
      dataStore.users.length > 0
        ? Math.max(...dataStore.users.map((u) => u.user_id)) + 1
        : 101,
    name: payload.admin_name,
    email: payload.admin_email,
    password_hash: hashPassword(payload.admin_password),
    role_id: 5, // Admin — the organization's owner/super user, above HOM (see utils/roles.js ROLE_ID_TO_NAME)
    organization_id: organization.organization_id,
    hospital_id: hospital.hospital_id,
    created_at: new Date().toISOString(),
  };
  dataStore.users.push(adminUser);
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

module.exports = {
  provision,
  generateApiKey,
  logStep,
  seedDefaultClinicalBaseline,
};
