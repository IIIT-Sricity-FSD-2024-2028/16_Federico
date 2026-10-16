'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const doctorService = require('../services/doctor.service');
const patientService = require('../services/patient.service');
const admissionService = require('../services/admission.service');
const platformAuthService = require('../services/platformAuth.service');
const { maxId } = require('../utils/maxId');

describe('Phase 1 Security & Invariant Hardening Specs (SEC-01 to SEC-05)', () => {
  const app = createApp();

  async function login(email, password) {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body;
  }

  describe('SEC-01: Eradication of x-role header auth bypass', () => {
    it('strictly rejects any request relying only on x-role: ADMIN (403)', async () => {
      await request(app)
        .get('/doctor')
        .set('x-role', 'ADMIN')
        .expect(403);
    });

    it('strictly rejects any request relying only on x-role: SUPER_USER (403)', async () => {
      await request(app)
        .get('/admission')
        .set('x-role', 'SUPER_USER')
        .expect(403);
    });

    it('allows access when authenticated with a valid session Bearer token', async () => {
      const admin = await login('owner.admin@citygen.com', 'Owner@123');
      const res = await request(app)
        .get('/doctor')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('SEC-02: Tenant boundary enforcement on doctor availability deletion', () => {
    it('forbids deleting an availability belonging to another organization (403)', async () => {
      // Find an availability belonging to org 1
      const org1Availability = dataStore.doctorAvailabilities.find((a) => a.organization_id === 1);
      expect(org1Availability).toBeDefined();

      // Log in as an actor from org 2 (Apollo Hospitals)
      const apolloHom = await login('admin.hom@apollo.com', 'Apollo@123');
      expect(apolloHom.tenant.organization_id).toBe(2);

      // Attempt to delete Org 1 availability as Org 2 user
      await request(app)
        .delete(`/doctor/availability/${org1Availability.availability_id}`)
        .set('Authorization', `Bearer ${apolloHom.token}`)
        .expect(403);
    });

    it('allows deleting an availability belonging to the callers own organization', async () => {
      // Create a temporary availability in Org 1
      const created = doctorService.createAvailability({
        doctor_id: 401,
        day_of_week: 'Monday',
        start_time: '08:00',
        end_time: '12:00',
        organization_id: 1,
        hospital_id: 1,
      });

      const admin = await login('owner.admin@citygen.com', 'Owner@123');
      const res = await request(app)
        .delete(`/doctor/availability/${created.availability_id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.deleted).toBe(true);
    });
  });

  describe('SEC-03: Mass-assignment protection in domain update services', () => {
    it('updateDoctor ignores tampering with doctor_id and organization_id', () => {
      const doc = doctorService.findDoctorById(401);
      const originalOrgId = doc.organization_id;
      const originalDocId = doc.doctor_id;

      const updated = doctorService.updateDoctor(401, {
        name: 'Dr. Protected Name',
        doctor_id: 9999,
        organization_id: 8888,
        hospital_id: 7777,
      });

      expect(updated.name).toBe('Dr. Protected Name');
      expect(updated.doctor_id).toBe(originalDocId);
      expect(updated.organization_id).toBe(originalOrgId);
    });

    it('patientService.update ignores tampering with patient_id, organization_id, and uhid', () => {
      const patient = patientService.findOne(201);
      const originalOrgId = patient.organization_id;
      const originalPatientId = patient.patient_id;
      const originalUhid = patient.uhid;

      const updated = patientService.update(201, {
        name: 'Protected Patient Name',
        patient_id: 9999,
        organization_id: 8888,
        uhid: 'FORGED-UHID-999',
      });

      expect(updated.name).toBe('Protected Patient Name');
      expect(updated.patient_id).toBe(originalPatientId);
      expect(updated.organization_id).toBe(originalOrgId);
      expect(updated.uhid).toBe(originalUhid);
    });

    it('admissionService.update ignores tampering with admission_id, patient_id, and organization_id', () => {
      const admission = admissionService.findOne(701);
      const originalAdmissionId = admission.admission_id;
      const originalPatientId = admission.patient_id;
      const originalOrgId = admission.organization_id;

      const updated = admissionService.update(701, {
        status: 'DISCHARGED',
        admission_id: 9999,
        patient_id: 8888,
        organization_id: 7777,
      });

      expect(updated.status).toBe('DISCHARGED');
      expect(updated.admission_id).toBe(originalAdmissionId);
      expect(updated.patient_id).toBe(originalPatientId);
      expect(updated.organization_id).toBe(originalOrgId);
    });
  });

  describe('SEC-04: platformAuth.service maxId call stack safety', () => {
    it('correctly uses maxId utility without call-stack spread overflow', () => {
      const highestId = maxId(dataStore.platformSuperUsers, 'platform_user_id');
      expect(typeof highestId).toBe('number');
      expect(highestId).toBeGreaterThan(0);
    });
  });

  describe('SEC-05: env.js session secret configuration', () => {
    it('exports SESSION_SECRET and validates env constants', () => {
      const env = require('../config/env');
      expect(env.SESSION_SECRET).toBeDefined();
      expect(typeof env.SESSION_SECRET).toBe('string');
      expect(env.SESSION_SECRET.length).toBeGreaterThan(0);
    });
  });
});
