'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const patientService = require('../services/patient.service');

describe('Patient Portal End-to-End Data Pipeline Integration Suite', () => {
  let app;
  let patientToken;
  let patientId;
  let snapshot;

  beforeAll(async () => {
    snapshot = {};
    for (const [k, v] of Object.entries(dataStore)) {
      if (Array.isArray(v)) {
        snapshot[k] = JSON.parse(JSON.stringify(v));
      }
    }

    app = createApp();

    // Authenticate as Arjun Kapoor (patient 201)
    const loginRes = await request(app)
      .post('/auth/login/patient')
      .send({ email: 'arjun.k@hosp.com', password: 'Hamiz@123', organization_id: 1 });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    patientToken = loginRes.body.token;
    patientId = loginRes.body.patient.patient_id;
    expect(patientId).toBe(201);
  });

  afterAll(() => {
    if (snapshot) {
      for (const [k, v] of Object.entries(snapshot)) {
        if (Array.isArray(dataStore[k])) {
          dataStore[k].length = 0;
          dataStore[k].push(...v);
        }
      }
    }
  });

  describe('1. Composite Portal Summary Endpoint (/patient/portal/summary/:id)', () => {
    it('returns fully hydrated patient summary data without missing relational fields', async () => {
      const res = await request(app)
        .get(`/patient/portal/summary/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      const data = res.body;

      // Patient profile integrity
      expect(data.patient).toBeDefined();
      expect(data.patient.patient_id).toBe(patientId);
      expect(data.patient.name).toBe('Arjun Kapoor');
      expect(data.patient.uhid).toBe('UHID-882100');
      expect(data.patient.email).toBe('arjun.k@hosp.com');
      expect(data.patient.phone).toBe('+91-9876543210');
      expect(data.patient.dob).toBe('1998-04-12');
      expect(data.patient.gender).toBe('Male');
      expect(data.patient.blood_group).toBe('O+');
      expect(data.patient.address).toBe('12 MG Road, Hyderabad');

      // User context
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('arjun.k@hosp.com');
      expect(data.user.orgName).toBe('City General Hospital');
      expect(data.user.hospitalName).toBe('City General Hospital');

      // Insurance
      expect(data.insurance).toBeDefined();
      expect(data.insurance.provider_name).toBe('Niva Bupa');
      expect(data.insurance.policy_number).toBe('NB-77210');
      expect(data.insurance.member_id).toBe('M-990');
      expect(data.insurance.coverage_limit).toBe(150000);

      // Relational collections
      expect(Array.isArray(data.appointments)).toBe(true);
      expect(data.appointments.length).toBeGreaterThan(0);
      expect(data.appointments[0].patient_id).toBe(patientId);
      expect(data.appointments[0].doctor_name).toBeDefined();
      expect(data.appointments[0].department).toBeDefined();

      expect(Array.isArray(data.preRequests)).toBe(true);
      expect(data.preRequests.length).toBeGreaterThan(0);
      expect(data.preRequests[0].patient_id).toBe(patientId);

      expect(Array.isArray(data.bundles)).toBe(true);
      expect(data.bundles.length).toBeGreaterThan(0);
      expect(data.bundles[0].admission.patient_id).toBe(patientId);
      expect(data.bundles[0].dischargeSummary).toBeDefined();

      expect(Array.isArray(data.dischargeSummaries)).toBe(true);
      expect(data.dischargeSummaries.length).toBeGreaterThan(0);

      expect(Array.isArray(data.receipts)).toBe(true);
      expect(data.receipts.length).toBeGreaterThan(0);
      expect(data.receipts[0].patient_id).toBe(patientId);

      expect(Array.isArray(data.doctors)).toBe(true);
      expect(data.doctors.length).toBeGreaterThan(0);
      expect(data.doctors[0].department).toBeDefined();

      expect(Array.isArray(data.beds)).toBe(true);
      expect(data.beds.length).toBeGreaterThan(0);
      expect(data.beds[0].ward_name).toBeDefined();

      expect(Array.isArray(data.services)).toBe(true);
      expect(data.services.length).toBeGreaterThan(0);

      expect(Array.isArray(data.specialties)).toBe(true);
      expect(data.specialties.length).toBeGreaterThan(0);
    });

    it('resolves summary when requested without explicit ID param (/patient/portal/summary)', async () => {
      const res = await request(app)
        .get('/patient/portal/summary')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.patient.patient_id).toBe(patientId);
    });

    it('strictly forbids patient from accessing another patient summary', async () => {
      const res = await request(app)
        .get('/patient/portal/summary/202')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Direct Appointment Endpoint (/appointment)', () => {
    it('allows patient to list their own appointments with relational doctor details', async () => {
      const res = await request(app)
        .get('/appointment')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const apt of res.body) {
        expect(apt.patient_id).toBe(patientId);
        expect(apt.doctor_name).toBeDefined();
        expect(apt.department).toBeDefined();
      }
    });

    it('allows patient to fetch a specific appointment belonging to them', async () => {
      const res = await request(app)
        .get('/appointment/603')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.appointment_id).toBe(603);
      expect(res.body.patient_id).toBe(patientId);
      expect(res.body.doctor_name).toBeDefined();
    });

    it('filters appointments by patient_id query parameter', async () => {
      const res = await request(app)
        .get(`/appointment?patient_id=${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((a) => a.patient_id === patientId)).toBe(true);
    });

    it('forbids patient from accessing another patient appointment by ID', async () => {
      // Appointment 601 belongs to patient 212
      const res = await request(app)
        .get('/appointment/601')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Direct Billing Endpoint (/billing)', () => {
    it('allows patient to fetch their billing ledgers via GET /billing', async () => {
      const res = await request(app)
        .get('/billing')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].admission.patient_id).toBe(patientId);
      expect(res.body[0].ledger).toBeDefined();
      expect(res.body[0].entries).toBeDefined();
      expect(res.body[0].dischargeSummary).toBeDefined();
    });

    it('filters bills by camelCase patientId query parameter (GET /billing?patientId=201)', async () => {
      const res = await request(app)
        .get(`/billing?patientId=${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].admission.patient_id).toBe(patientId);
    });

    it('forbids patient from accessing another patient bills via query parameter (GET /billing?patientId=202)', async () => {
      const res = await request(app)
        .get('/billing?patientId=202')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    it('returns organization billing services via GET /billing/services', async () => {
      const res = await request(app)
        .get('/billing/services')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].service_name).toBeDefined();
      expect(res.body[0].base_cost).toBeDefined();
    });
  });

  describe('4. Direct Insurance Endpoint (/patient/insurance)', () => {
    it('returns patient insurance policies on GET /patient/insurance without route collision', async () => {
      const res = await request(app)
        .get('/patient/insurance')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].patient_id).toBe(patientId);
      expect(res.body[0].provider_name).toBe('Niva Bupa');
      expect(res.body[0].policy_number).toBe('NB-77210');
    });

    it('supports camelCase patientId query on GET /patient/insurance?patientId=201', async () => {
      const res = await request(app)
        .get(`/patient/insurance?patientId=${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].patient_id).toBe(patientId);
    });

    it('returns patient insurance on parameterized route /patient/:id/insurance', async () => {
      const res = await request(app)
        .get(`/patient/${patientId}/insurance`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].provider_name).toBe('Niva Bupa');
    });

    it('creates new insurance policy propagating organization_id and hospital_id', async () => {
      const newPolicy = {
        patient_id: patientId,
        provider_name: 'Care Health',
        policy_number: 'CH-88331',
        coverage_limit: 300000,
        coverage_type: 'Comprehensive',
      };

      const res = await request(app)
        .post('/patient/insurance')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(newPolicy);

      expect(res.status).toBe(201);
      expect(res.body.policy_number).toBe('CH-88331');
      expect(res.body.organization_id).toBe(1);
      expect(res.body.hospital_id).toBe(1);
    });

    it('forbids patient from accessing another patient insurance record', async () => {
      const res = await request(app)
        .get('/patient/202/insurance')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('5. Direct Doctor Endpoint (/doctor)', () => {
    it('returns doctors with department and specialization for patient consultation booking', async () => {
      const res = await request(app)
        .get('/doctor')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const doc of res.body) {
        expect(doc.name).toBeDefined();
        expect(doc.specialization).toBeDefined();
        expect(doc.department).toBeDefined();
      }
    });
  });

  describe('6. Direct Ward Bed Endpoint (/ward/bed and /ward/beds)', () => {
    it('allows patient to read beds on /ward/beds without 403 Forbidden', async () => {
      const res = await request(app)
        .get('/ward/beds')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].ward_name).toBeDefined();
    });

    it('allows patient to read beds on singular /ward/bed without 404 Not Found', async () => {
      const res = await request(app)
        .get('/ward/bed')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].ward_name).toBeDefined();
    });

    it('allows reading a specific bed on /ward/bed/:id with relational ward_name', async () => {
      const res = await request(app)
        .get('/ward/bed/46')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.bed_id).toBe(46);
      expect(res.body.bed_number).toBeDefined();
      expect(res.body.ward_name).toBeDefined();
    });

    it('returns enriched beds with ward_name on GET /ward/:id/beds', async () => {
      const res = await request(app)
        .get('/ward/1/beds')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].ward_name).toBeDefined();
    });
  });

  describe('7. Profile Update Pipeline & Relational Sync', () => {
    it('updates patient email and synchronizes linked user record in dataStore', async () => {
      const updatedEmail = 'arjun.updated@hosp.com';
      const patchRes = await request(app)
        .put(`/patient/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ email: updatedEmail });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.email).toBe(updatedEmail);

      const patientInStore = patientService.findOne(patientId);
      expect(patientInStore.email).toBe(updatedEmail);

      const userInStore = dataStore.users.find((u) => u.user_id === 102);
      expect(userInStore.email).toBe(updatedEmail);

      // Restore original email
      await request(app)
        .put(`/patient/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ email: 'arjun.k@hosp.com' });
    });

    it('updates patient name and synchronizes linked user record in dataStore', async () => {
      const updatedName = 'Arjun R. Kapoor';
      const patchRes = await request(app)
        .put(`/patient/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ name: updatedName });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.name).toBe(updatedName);

      const userInStore = dataStore.users.find((u) => u.user_id === 102);
      expect(userInStore.name).toBe(updatedName);

      // Restore original name
      await request(app)
        .put(`/patient/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ name: 'Arjun Kapoor' });
    });
  });
});
