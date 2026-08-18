'use strict';

const crypto = require('crypto');
const dataStore = require('../store/dataStore');
const organizationService = require('./organization.service');
const subscriptionService = require('./subscription.service');
const planService = require('./subscriptionPlan.service');
const { hashPassword } = require('../utils/password');

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
    organization_id: organizationId,
    step,
    status,
    message,
    created_at: new Date().toISOString(),
  });
}

function generateApiKey(organizationId, label) {
  const newKey = {
    api_key_id:
      dataStore.apiKeys.length > 0
        ? Math.max(...dataStore.apiKeys.map((k) => k.api_key_id)) + 1
        : 1,
    organization_id: organizationId,
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

  const enabledModules = organizationService.setModuleFlags(
    organization.organization_id,
    payload.modules || plan.included_modules,
  );
  logStep(
    organization.organization_id,
    'ENABLE_MODULES',
    'DONE',
    `Enabled modules: ${enabledModules.join(', ') || 'none'}`,
  );

  const adminUser = {
    user_id:
      dataStore.users.length > 0
        ? Math.max(...dataStore.users.map((u) => u.user_id)) + 1
        : 101,
    name: payload.admin_name,
    email: payload.admin_email,
    password_hash: hashPassword(payload.admin_password),
    role_id: 1, // HOM — the organization's default administrator (see auth.service.js ROLE_ID_TO_NAME)
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

module.exports = { provision, generateApiKey, logStep };
