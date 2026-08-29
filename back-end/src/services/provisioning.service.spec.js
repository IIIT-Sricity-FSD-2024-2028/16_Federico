'use strict';

const provisioningService = require('./provisioning.service');
const planService = require('./subscriptionPlan.service');
const organizationService = require('./organization.service');
const dataStore = require('../store/dataStore');
const { verifyPassword } = require('../utils/password');

describe('services/provisioning.service', () => {
  it('provision() stands up an organization, primary hospital, subscription, enabled modules, default admin, and an API key in one call', () => {
    const plan = planService.create({
      name: 'Provisioning Test Plan',
      max_beds: 25,
      max_users: 10,
      max_hospitals: 1,
      storage_gb: 10,
      api_rate_limit: 60,
      included_modules: ['APPOINTMENTS', 'BILLING'],
      price_monthly: 1000,
    });

    const result = provisioningService.provision({
      name: 'Provisioning Test Hospital',
      contact: {
        phone: '+91-1234567890',
        email: 'ops@provtest.example',
        address: 'Test Address',
      },
      admin_name: 'Prov Admin',
      admin_email: 'prov-admin@provtest.example',
      admin_password: 'ProvAdmin@123',
      plan_id: plan.plan_id,
    });

    expect(result.organization.name).toBe('Provisioning Test Hospital');
    expect(result.hospital.organization_id).toBe(
      result.organization.organization_id,
    );
    expect(result.hospital.is_primary).toBe(true);
    expect(result.subscription.plan_id).toBe(plan.plan_id);
    expect(result.apiKey.organization_id).toBe(
      result.organization.organization_id,
    );
    expect(result.apiKey.key).toMatch(/^fed_live_/);

    // Modules default to the plan's included set when none are explicitly requested.
    const enabledModules = organizationService.enabledModulesFor(
      result.organization.organization_id,
    );
    expect(enabledModules.sort()).toEqual(['APPOINTMENTS', 'BILLING'].sort());

    // Default admin is a real, immediately-usable login (role_id 5 = Admin,
    // the org's owner/super user — above HOM, not HOM itself).
    const adminUser = dataStore.users.find(
      (u) => u.user_id === result.admin.user_id,
    );
    expect(adminUser.role_id).toBe(5);
    expect(adminUser.organization_id).toBe(result.organization.organization_id);
    expect(verifyPassword('ProvAdmin@123', adminUser.password_hash)).toBe(true);

    // Every step logged to the provisioning audit trail.
    const log = dataStore.provisioningLog.filter(
      (l) => l.organization_id === result.organization.organization_id,
    );
    expect(log.map((l) => l.step)).toEqual([
      'CREATE_ORGANIZATION',
      'GENERATE_CONFIGURATION',
      'ALLOCATE_QUOTAS',
      'ENABLE_MODULES',
      'CREATE_DEFAULT_ADMIN',
      'SEED_DEFAULT_WARDS',
      'SEED_DEFAULT_SERVICES',
      'SEED_DEFAULT_INVENTORY',
      'GENERATE_API_KEY',
    ]);
    expect(log.every((l) => l.status === 'DONE')).toBe(true);

    // A brand-new hospital no longer starts with zero wards/inventory —
    // the standard 6 department/ward pairs + starter catalog are seeded.
    const wards = dataStore.wards.filter(
      (w) => w.organization_id === result.organization.organization_id,
    );
    expect(wards.map((w) => w.ward_name).sort()).toEqual(
      [
        'ICU',
        'General Ward',
        'Surgical Ward',
        'Pediatric Ward',
        'Emergency Ward',
        'Maternity Ward',
      ].sort(),
    );
    const beds = dataStore.beds.filter(
      (b) => b.organization_id === result.organization.organization_id,
    );
    expect(beds.length).toBe(wards.reduce((sum, w) => sum + w.total_beds, 0));
    expect(beds.every((b) => b.status === 'AVAILABLE')).toBe(true);

    const items = dataStore.inventoryItems.filter(
      (i) => i.organization_id === result.organization.organization_id,
    );
    expect(items.length).toBeGreaterThan(0);
  });

  it('provision() respects an explicit modules list instead of defaulting to the plan', () => {
    const plan = planService.create({
      name: 'Provisioning Test Plan 2',
      max_beds: 25,
      max_users: 10,
      max_hospitals: 1,
      storage_gb: 10,
      api_rate_limit: 60,
      included_modules: ['APPOINTMENTS', 'BILLING', 'INSURANCE'],
      price_monthly: 1000,
    });

    const result = provisioningService.provision({
      name: 'Provisioning Test Hospital 2',
      admin_name: 'Prov Admin 2',
      admin_email: 'prov-admin-2@provtest.example',
      admin_password: 'ProvAdmin@123',
      plan_id: plan.plan_id,
      modules: ['APPOINTMENTS'],
    });

    expect(
      organizationService.enabledModulesFor(
        result.organization.organization_id,
      ),
    ).toEqual(['APPOINTMENTS']);
  });

  it('provision() with an unknown plan returns an error and creates nothing', () => {
    const orgCountBefore = organizationService.findAll().length;
    const result = provisioningService.provision({
      name: 'Should Not Exist',
      admin_name: 'X',
      admin_email: 'x@nowhere.example',
      admin_password: 'x',
      plan_id: 999999,
    });
    expect(result.error).toBe('PLAN_NOT_FOUND');
    expect(organizationService.findAll().length).toBe(orgCountBefore);
  });
});
