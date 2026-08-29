'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const provisioningService = require('../services/provisioning.service');
const authService = require('../services/auth.service');
const patientService = require('../services/patient.service');
const dataStore = require('../store/dataStore');
const persist = require('../store/persist');

describe('Data Integrity, Foreign Key Validation & Composite Endpoint Tests', () => {
  let app;
  let adminToken;
  let homToken;
  let preToken;
  let tenantOrg;

  beforeAll(async () => {
    app = createApp();

    // 1. Provision an organization with an Admin user
    const provisionResult = provisioningService.provision({
      name: 'Integrity Hospital',
      plan_id: 1,
      contact: { phone: '+919876543210', email: 'contact@integrity.com', address: 'Bangalore' },
      specialties: ['Cardiology', 'General Medicine'],
      emergency_available: true,
      admin_name: 'Integrity Admin',
      admin_email: 'admin@integrity.com',
      admin_password: 'Password@123',
    });

    tenantOrg = provisionResult.organization;

    // Login as Admin
    const adminLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@integrity.com', password: 'Password@123' });

    adminToken = adminLoginRes.body.token;

    // Create HOM and PRE staff users
    const homSignup = authService.signup({
      name: 'HOM Manager',
      email: 'hom@integrity.com',
      password: 'Password@123',
      organization_id: tenantOrg.organization_id,
      hospital_id: 1,
    });
    const homUser = dataStore.users.find((u) => u.user_id === homSignup.user.user_id);
    Object.assign(homUser, { role_id: 1, role: 'HOM' });

    const preSignup = authService.signup({
      name: 'PRE Desk',
      email: 'pre@integrity.com',
      password: 'Password@123',
      organization_id: tenantOrg.organization_id,
      hospital_id: 1,
    });
    const preUser = dataStore.users.find((u) => u.user_id === preSignup.user.user_id);
    Object.assign(preUser, { role_id: 4, role: 'PRE' });

    const homLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'hom@integrity.com', password: 'Password@123' });
    homToken = homLoginRes.body.token;

    const preLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'pre@integrity.com', password: 'Password@123' });
    preToken = preLoginRes.body.token;
  });

  afterAll(() => {
    persist.saveImmediate();
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /health returns 200 with UP status and uptime', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.service).toBe('Federico HMS Backend');
    });
  });

  describe('2. Relational Foreign Key Integrity', () => {
    it('rejects appointment creation with non-existent patient_id', async () => {
      const res = await request(app)
        .post('/appointment')
        .set('Authorization', `Bearer ${preToken}`)
        .send({
          patient_id: 999999,
          appointment_date: '2026-09-01',
          appointment_time: '10:00 AM',
          department: 'Cardiology',
          created_by: 101,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Patient #999999 not found');
    });

    it('rejects appointment creation with non-existent doctor_id', async () => {
      // Create valid patient
      const patient = patientService.create({
        name: 'FK Test Patient',
        organization_id: tenantOrg.organization_id,
        hospital_id: 1,
      });

      const res = await request(app)
        .post('/appointment')
        .set('Authorization', `Bearer ${preToken}`)
        .send({
          patient_id: patient.patient_id,
          doctor_id: 888888,
          appointment_date: '2026-09-01',
          appointment_time: '10:00 AM',
          department: 'Cardiology',
          created_by: 101,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Doctor #888888 not found');
    });

    it('rejects billing leader charge creation with non-existent admission_id', async () => {
      const res = await request(app)
        .post('/billing/leaders')
        .set('Authorization', `Bearer ${homToken}`)
        .send({
          admission_id: 777777,
          service_id: 1,
          quantity: 2,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Admission #777777 not found');
    });

    it('rejects doctor availability creation with non-existent doctor_id', async () => {
      const res = await request(app)
        .post('/doctor/availability')
        .set('Authorization', `Bearer ${homToken}`)
        .send({
          doctor_id: 666666,
          available_date: '2026-09-01',
          start_time: '09:00',
          end_time: '12:00',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Doctor #666666 not found');
    });
  });

  describe('3. Composite Patient Portal Summary Endpoint', () => {
    it('GET /patient/portal/summary returns consolidated summary in 1 call', async () => {
      // Create patient in the tenant
      const patient = patientService.create({
        name: 'Portal Test Patient',
        uhid: 'UHID-PORTAL1',
        dob: '1990-01-01',
        phone: '+919876543210',
        organization_id: tenantOrg.organization_id,
        hospital_id: 1,
      });

      const res = await request(app)
        .get(`/patient/portal/summary/${patient.patient_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.patient.patient_id).toBe(patient.patient_id);
      expect(Array.isArray(res.body.preRequests)).toBe(true);
      expect(Array.isArray(res.body.appointments)).toBe(true);
      expect(Array.isArray(res.body.bundles)).toBe(true);
      expect(Array.isArray(res.body.receipts)).toBe(true);
      expect(Array.isArray(res.body.doctors)).toBe(true);
      expect(Array.isArray(res.body.beds)).toBe(true);
      expect(Array.isArray(res.body.services)).toBe(true);
    });
  });
});
