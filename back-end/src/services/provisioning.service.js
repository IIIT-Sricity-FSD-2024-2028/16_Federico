'use strict';

const crypto = require('crypto');
const { organizationRepository, userRepository } = require('../repositories');
const organizationService = require('./organization.service');
const subscriptionService = require('./subscription.service');
const planService = require('./subscriptionPlan.service');
const wardService = require('./ward.service');
const inventoryService = require('./inventory.service');
const { hashPassword } = require('../utils/password');
const {
  DEFAULT_DEPARTMENTS,
  DEFAULT_INVENTORY_ITEMS,
} = require('../config/defaultClinicalCatalog');

function logStep(organizationId, step, status, message) {
  return organizationRepository.logProvisioning({
    organization_id: Number(organizationId),
    step,
    status,
    message,
  });
}

function seedDefaultClinicalBaseline(organizationId, hospitalId) {
  DEFAULT_DEPARTMENTS.forEach(({ wardName, defaultBeds }) => {
    wardService.createWard({
      ward_name: wardName,
      total_beds: defaultBeds,
      description: `${wardName} — default baseline`,
      organization_id: organizationId,
      hospital_id: hospitalId,
    });
  });

  DEFAULT_INVENTORY_ITEMS.forEach((item) => {
    inventoryService.createItem({
      ...item,
      service_id: null,
      organization_id: organizationId,
      hospital_id: hospitalId,
    });
  });
}

function generateApiKey(organizationId, label) {
  return organizationRepository.createApiKey({
    organization_id: Number(organizationId),
    label: label || 'Default',
    key: `fed_live_${crypto.randomBytes(18).toString('hex')}`,
    revoked_at: null,
  });
}

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

  const adminUser = userRepository.create({
    name: payload.admin_name,
    email: payload.admin_email,
    password_hash: hashPassword(payload.admin_password),
    role_id: 5, // Admin
    organization_id: organization.organization_id,
    hospital_id: hospital.hospital_id,
  });
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
    'SEED_DEFAULT_INVENTORY',
    'DONE',
    `Seeded ${DEFAULT_INVENTORY_ITEMS.length} default inventory items`,
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
