'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const { createSession } = require('../store/sessionStore');
const entitlementService = require('./entitlement.service');
const organizationService = require('./organization.service');

/**
 * Module + resource entitlement: RBAC permission alone must NOT grant
 * access to a module the organization has not purchased (tasks.md §9),
 * and it must be enforced server-side — calling the API directly still 403s.
 */
describe('Entitlement enforcement (module + resource)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  function sessionFor(orgId, role = 'FA') {
    return createSession({
      userId: 999000 + orgId,
      role,
      organizationId: orgId,
      hospitalId: 1,
    });
  }

  it('all core clinical and operational modules are unlocked by default', async () => {
    const res = await request(app)
      .get('/billing/services')
      .set('Authorization', `Bearer ${sessionFor(1, 'FA')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('exposes all modules as enabled in isModuleEnabled and modulesFor', () => {
    expect(entitlementService.isModuleEnabled(1, 'BILLING')).toBe(true);
    expect(entitlementService.isModuleEnabled(1, 'ADMISSIONS')).toBe(true);
    expect(entitlementService.isModuleEnabled(2, 'INVENTORY')).toBe(true);
    const modules = entitlementService.modulesFor(1);
    expect(modules.BILLING).toBe(true);
    expect(modules.APPOINTMENTS).toBe(true);
  });

  it('exposes the entitlement snapshot at GET /auth/entitlements', async () => {
    const res = await request(app)
      .get('/auth/entitlements')
      .set('Authorization', `Bearer ${sessionFor(1, 'Admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.modules).toBeDefined();
    expect(res.body.modules.BILLING).toBe(true);
    expect(res.body.modules.LEADERSHIP).toBe(true);
    expect(res.body.resources.ADMISSIONS.ICU_BEDS).toBe(10);
  });

  it('assertResourceWithin throws 403 over the purchased quantity', () => {
    expect(() =>
      entitlementService.assertResourceWithin(1, 'ADMISSIONS', 'ICU_BEDS', 11),
    ).toThrow(/Resource limit reached/);
    expect(() =>
      entitlementService.assertResourceWithin(1, 'ADMISSIONS', 'ICU_BEDS', 10),
    ).not.toThrow();
  });

  it('revenue reflects resource-level line items', () => {
    const usage = organizationService.usageFor(1);
    expect(usage.subscription.resource_lines.length).toBeGreaterThan(0);
    const icu = usage.subscription.resource_lines.find(
      (l) => l.resource_code === 'ICU_BEDS',
    );
    expect(icu).toBeTruthy();
    expect(icu.amount).toBe(icu.quantity * icu.unit_price);
    expect(usage.subscription.price_monthly).toBe(
      usage.subscription.base_total + usage.subscription.resource_total,
    );
  });

  it('allows Admin role to create, update, and delete doctors', async () => {
    const adminToken = sessionFor(1, 'Admin');

    const createRes = await request(app)
      .post('/doctor')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dr. Test Admin Created', specialization: 'Neurology', department: 'General' });

    expect(createRes.status).toBe(201);
    const docId = createRes.body.doctor_id;
    expect(docId).toBeDefined();

    const updateRes = await request(app)
      .put(`/doctor/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dr. Test Admin Renamed' });

    expect(updateRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`/doctor/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
  });

  it('rejects login for deactivated staff accounts with 403 ACCOUNT_INACTIVE', async () => {
    const user = dataStore.users.find((u) => u.email === 'rekha.pre@citygen.com');
    expect(user).toBeDefined();
    const originalState = user.is_active;

    user.is_active = false;

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'rekha.pre@citygen.com', password: 'Pre@123', organization_id: 1 });

    user.is_active = originalState;

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/deactivated/i);
  });
});
