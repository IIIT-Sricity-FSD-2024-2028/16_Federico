'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const subscriptionService = require('./subscription.service');
const organizationService = require('./organization.service');
const serviceCatalog = require('../config/serviceCatalog');

describe('Platform Revenue Analytics & Marketplace Self-Service Onboarding', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('should expose the single usage-based service plan (no fixed tiers)', async () => {
    const res = await request(app).get('/marketplace/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // The three fixed Basic/Pro/Enterprise tiers were removed in favour of
    // usage-based, per-service billing — there is exactly one anchor plan.
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Usage-based');
    expect(res.body[0].price_monthly).toBe(0);
  });

  it('should allow a new hospital chain to self-register, pay, and automatically provision tenant', async () => {
    const payload = {
      name: 'Global Health Network',
      city: 'Hyderabad',
      phone: '+91 9988776655',
      address: 'HITEC City, Hyderabad',
      specialties: ['Cardiology', 'Neurology', 'Orthopedics'],
      emergency_available: true,
      plan_id: 1,
      modules: ['APPOINTMENTS', 'ADMISSIONS', 'INVENTORY', 'BILLING', 'INSURANCE'],
      admin_name: 'Dr. Vikram Rao',
      admin_email: 'vikram.admin@globalhealth.com',
      admin_password: 'Password@123',
      payment_reference: 'PAY_TEST_12345',
    };

    const res = await request(app)
      .post('/marketplace/register-organization')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Organization successfully registered and provisioned');
    expect(res.body.provisioned).toBeDefined();
    expect(res.body.provisioned.organization.name).toBe('Global Health Network');
    expect(res.body.provisioned.organization.organization_id).toBeDefined();
    expect(res.body.provisioned.hospital).toBeDefined();
    expect(res.body.provisioned.apiKey).toBeDefined();
    expect(res.body.provisioned.apiKey.key).toMatch(/^fed_live_/);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.token).toBeDefined();
  });

  it('should calculate live platform MRR/ARR from per-service usage for Platform Super User', async () => {
    const loginRes = await request(app)
      .post('/platform/auth/login')
      .send({ email: 'platform@federico.com', password: 'Federico@Platform123' });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const usageRes = await request(app)
      .get('/platform/usage')
      .set('Authorization', `Bearer ${token}`);

    expect(usageRes.status).toBe(200);
    expect(usageRes.body.total_mrr).toBeGreaterThan(0);
    expect(usageRes.body.total_arr).toBe(usageRes.body.total_mrr * 12);

    // Revenue is broken down per service, not per plan tier.
    expect(usageRes.body.revenue_by_plan).toBeDefined();
    expect(usageRes.body.revenue_by_service).toBeDefined();
    expect(usageRes.body.revenue_by_plan.Billing).toBeDefined();
    expect(usageRes.body.revenue_by_plan.Appointments).toBeDefined();

    const org = usageRes.body.organizations.find(
      (o) => o.name === 'Global Health Network',
    );
    expect(org).toBeDefined();
    expect(org.subscription.plan_name).toBe('Usage-based');
    expect(org.subscription.billing_model).toBe('USAGE');
    // 5 chosen services × 1 branch instance.
    const expectedCost = serviceCatalog.computeCost(
      ['APPOINTMENTS', 'ADMISSIONS', 'INVENTORY', 'BILLING', 'INSURANCE'],
      1,
    ).total;
    expect(org.subscription.price_monthly).toBe(expectedCost);
    expect(org.subscription.service_lines).toHaveLength(5);
    expect(org.enabled_modules).toContain('APPOINTMENTS');
    expect(org.enabled_modules).toContain('BILLING');
  });
});
