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
      email_domain: 'provtest.example',
      admin_email: 'prov.admin@provtest.example',
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

  it('provision() stores module_resources capacity limits correctly', () => {
    const plan = planService.create({
      name: 'Provisioning Test Plan 2',
      max_beds: 25,
      max_users: 10,
      max_hospitals: 1,
      storage_gb: 10,
      api_rate_limit: 60,
      price_monthly: 1000,
    });

    const result = provisioningService.provision({
      name: 'Provisioning Test Hospital 2',
      admin_name: 'Prov Admin 2',
      email_domain: 'provtest2.example',
      admin_email: 'prov2.admin@provtest2.example',
      admin_password: 'ProvAdmin@123',
      plan_id: plan.plan_id,
      module_resources: {
        ADMISSIONS: { GENERAL_BEDS: 30, ICU_BEDS: 5 },
      },
    });

    const resources = organizationService.resourceQuantitiesFor(
      result.organization.organization_id,
    );
    expect(resources.ADMISSIONS.GENERAL_BEDS).toBe(30);
    expect(resources.ADMISSIONS.ICU_BEDS).toBe(5);

    const seededWards = dataStore.wards.filter(
      (w) => w.organization_id === result.organization.organization_id,
    );
    expect(seededWards.map((w) => ({ name: w.ward_name, total_beds: w.total_beds }))).toEqual([
      { name: 'General Ward', total_beds: 30 },
      { name: 'ICU', total_beds: 5 },
    ]);
    const seededBeds = dataStore.beds.filter(
      (b) => b.organization_id === result.organization.organization_id,
    );
    expect(seededBeds).toHaveLength(35);
  });

  it('provision() with 1 bed each creates exact 1-bed wards (no 8-bed ICU default)', async () => {
    const plan = planService.create({
      name: 'Provisioning Exact Scale Plan',
      max_beds: 25,
      max_users: 10,
      max_hospitals: 1,
      storage_gb: 10,
      api_rate_limit: 60,
      price_monthly: 1000,
    });

    const result = provisioningService.provision({
      name: 'Exact Scale Hospital',
      admin_name: 'Exact Admin',
      email_domain: 'exactscale.example',
      admin_email: 'exact.admin@exactscale.example',
      admin_password: 'ExactAdmin@123',
      plan_id: plan.plan_id,
      module_resources: {
        ADMISSIONS: { GENERAL_BEDS: 1, ICU_BEDS: 1, PRIVATE_BEDS: 1 },
        DOCTOR: { DOCTOR_SEATS: 1 },
        BILLING: { BILLING_TERMINALS: 1, STAFF_SEATS: 1 },
        INVENTORY: { WAREHOUSES: 1 },
        PATIENT: { PATIENT_ADMISSIONS: 1 },
      },
    });

    const seededWards = dataStore.wards.filter(
      (w) => w.organization_id === result.organization.organization_id,
    );
    expect(seededWards).toHaveLength(3);
    expect(seededWards.find((w) => w.ward_name === 'ICU').total_beds).toBe(1);
    expect(seededWards.find((w) => w.ward_name === 'General Ward').total_beds).toBe(1);
    expect(seededWards.find((w) => w.ward_name === 'Private / Semi-Private Ward').total_beds).toBe(1);

    const seededBeds = dataStore.beds.filter(
      (b) => b.organization_id === result.organization.organization_id,
    );
    expect(seededBeds).toHaveLength(3);

    const request = require('supertest');
    const { createApp } = require('../app');
    const { createSession } = require('../store/sessionStore');
    const app = createApp();
    const token = createSession({
      userId: result.admin.user_id,
      role: 'Admin',
      organizationId: result.organization.organization_id,
      hospitalId: result.hospital.hospital_id,
    });
    const dashRes = await request(app)
      .get('/data/admin-dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.tenant.hospital_name).toBe(result.hospital.name);
    expect(dashRes.body.tenant.branch_count).toBe(1);
    expect(dashRes.body.wards).toHaveLength(3);
    expect(dashRes.body.beds).toHaveLength(3);
    expect(dashRes.body.summary).toEqual({
      totalRevenue: 0,
      collected: 0,
      outstandingBalance: 0,
      collectionRate: 0,
    });
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
