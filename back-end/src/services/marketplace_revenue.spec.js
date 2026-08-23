'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const subscriptionService = require('./subscription.service');
const organizationService = require('./organization.service');

describe('Platform Revenue Analytics & Marketplace Self-Service Onboarding', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('should list public subscription plans without auth', async () => {
    const res = await request(app).get('/marketplace/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    const starter = res.body.find((p) => p.name === 'Starter');
    expect(starter).toBeDefined();
    expect(starter.price_monthly).toBe(4999);
  });

  it('should allow a new hospital chain to self-register, pay, and automatically provision tenant', async () => {
    const payload = {
      name: 'Global Health Network',
      city: 'Hyderabad',
      phone: '+91 9988776655',
      address: 'HITEC City, Hyderabad',
      specialties: ['Cardiology', 'Neurology', 'Orthopedics'],
      emergency_available: true,
      plan_id: 2, // Professional
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

  it('should calculate live platform MRR and ARR for Platform Super User', async () => {
    // 1. Authenticate as Platform Super User
    const loginRes = await request(app)
      .post('/platform/auth/login')
      .send({ email: 'platform@federico.com', password: 'Federico@Platform123' });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    // 2. Fetch platform usage & financials
    const usageRes = await request(app)
      .get('/platform/usage')
      .set('Authorization', `Bearer ${token}`);

    expect(usageRes.status).toBe(200);
    expect(usageRes.body.total_mrr).toBeGreaterThan(0);
    expect(usageRes.body.total_arr).toBe(usageRes.body.total_mrr * 12);
    expect(usageRes.body.revenue_by_plan).toBeDefined();
    expect(usageRes.body.revenue_by_plan.Starter).toBeDefined();
    expect(usageRes.body.revenue_by_plan.Professional).toBeDefined();

    // Verify organization details include subscription pricing & modules
    const org = usageRes.body.organizations.find((o) => o.name === 'Global Health Network');
    expect(org).toBeDefined();
    expect(org.subscription.plan_name).toBe('Professional');
    expect(org.subscription.price_monthly).toBe(14999);
    expect(org.enabled_modules).toContain('APPOINTMENTS');
    expect(org.enabled_modules).toContain('BILLING');
  });
});
