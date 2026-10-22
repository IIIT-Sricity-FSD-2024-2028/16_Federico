'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const { maxId, nextId } = require('../utils/maxId');
const admissionService = require('../services/admission.service');
const appointmentService = require('../services/appointment.service');
const billingService = require('../services/billing.service');
const doctorService = require('../services/doctor.service');
const inventoryService = require('../services/inventory.service');
const patientService = require('../services/patient.service');
const preRequestService = require('../services/preRequest.service');
const wardService = require('../services/ward.service');
const organizationService = require('../services/organization.service');
const subscriptionService = require('../services/subscription.service');
const subscriptionPlanService = require('../services/subscriptionPlan.service');
const authService = require('../services/auth.service');

describe('Backend Data Storage, Coercion & Schema Invariants', () => {
  const app = createApp();

  describe('String Coercion in Primary & Foreign Key Lookups', () => {
    it('finds admission by numeric string ID via admissionService.findOne', () => {
      const first = dataStore.admissions[0];
      expect(first).toBeDefined();
      const found = admissionService.findOne(String(first.admission_id));
      expect(found).not.toBeNull();
      expect(found.admission_id).toBe(first.admission_id);
    });

    it('finds appointment by numeric string ID via appointmentService.findOne', () => {
      const first = dataStore.appointments[0];
      expect(first).toBeDefined();
      const found = appointmentService.findOne(String(first.appointment_id));
      expect(found).not.toBeNull();
      expect(found.appointment_id).toBe(first.appointment_id);
    });

    it('coerces string admission_id and ledger_id in billingService ledger lookups', () => {
      const first = dataStore.ledgers[0];
      expect(first).toBeDefined();
      const byAdmission = billingService.findLedgerByAdmission(String(first.admission_id));
      expect(byAdmission).not.toBeNull();
      expect(byAdmission.ledger_id).toBe(first.ledger_id);

      const byId = billingService.findLedgerById(String(first.ledger_id));
      expect(byId).not.toBeNull();
      expect(byId.ledger_id).toBe(first.ledger_id);
    });

    it('coerces string ledger_id in billingService.findLedgerEntries', () => {
      const first = dataStore.ledgers[0];
      const entries = billingService.findLedgerEntries(String(first.ledger_id));
      expect(Array.isArray(entries)).toBe(true);
      if (entries.length > 0) {
        expect(entries[0].ledger_id).toBe(first.ledger_id);
      }
    });

    it('coerces string admission_id in billingService.findDischargeSummaryByAdmission', () => {
      const summary = dataStore.dischargeSummaries[0];
      expect(summary).toBeDefined();
      const found = billingService.findDischargeSummaryByAdmission(String(summary.admission_id));
      expect(found).not.toBeNull();
      expect(found.summary_id).toBe(summary.summary_id);
    });

    it('coerces string leader_id in billingService.findLeaderById', () => {
      const leader = billingService.createLeader({
        admission_id: dataStore.admissions[0].admission_id,
        service_id: dataStore.services[0].service_id,
        quantity: 2,
        organization_id: 1,
      });
      const found = billingService.findLeaderById(String(leader.leader_id));
      expect(found).not.toBeNull();
      expect(found.leader_id).toBe(leader.leader_id);
    });

    it('coerces string IDs for doctors and availabilities in doctorService', () => {
      const doc = dataStore.doctors[0];
      expect(doc).toBeDefined();
      const foundDoc = doctorService.findDoctorById(String(doc.doctor_id));
      expect(foundDoc).not.toBeNull();
      expect(foundDoc.doctor_id).toBe(doc.doctor_id);

      const avails = doctorService.findAvailabilityByDoctor(String(doc.doctor_id));
      expect(Array.isArray(avails)).toBe(true);

      const avail = dataStore.doctorAvailabilities[0];
      if (avail) {
        const foundAvail = doctorService.findAvailabilityById(String(avail.availability_id));
        expect(foundAvail).not.toBeNull();
        expect(foundAvail.availability_id).toBe(avail.availability_id);
      }
    });

    it('coerces string item_id and request_id in inventoryService', () => {
      const item = dataStore.inventoryItems[0];
      expect(item).toBeDefined();
      const originalStock = item.stock_quantity;
      const updated = inventoryService.updateItem(String(item.item_id), { stock_quantity: originalStock + 1 });
      expect(updated).not.toBeNull();
      expect(updated.stock_quantity).toBe(originalStock + 1);
      inventoryService.updateItem(item.item_id, { stock_quantity: originalStock });

      const req = dataStore.purchaseRequests[0];
      if (req) {
        const originalStatus = req.status;
        const updatedReq = inventoryService.updateRequest(String(req.request_id), { status: 'APPROVED' });
        expect(updatedReq).not.toBeNull();
        expect(updatedReq.status).toBe('APPROVED');
        inventoryService.updateRequest(req.request_id, { status: originalStatus });
      }
    });

    it('coerces string pre_request_id in preRequestService.findOne', () => {
      const pr = dataStore.preRequests[0];
      expect(pr).toBeDefined();
      const found = preRequestService.findOne(String(pr.pre_request_id));
      expect(found).not.toBeNull();
      expect(found.pre_request_id).toBe(pr.pre_request_id);
    });

    it('coerces string ward_id in wardService.findBedsByWard', () => {
      const ward = dataStore.wards[0];
      expect(ward).toBeDefined();
      const beds = wardService.findBedsByWard(String(ward.ward_id));
      expect(Array.isArray(beds)).toBe(true);
      expect(beds.length).toBeGreaterThan(0);
      expect(beds[0].ward_id).toBe(ward.ward_id);
    });

    it('coerces string IDs in organization, subscription, and subscription plan services', () => {
      const org = organizationService.findById('1');
      expect(org).not.toBeNull();
      expect(org.organization_id).toBe(1);

      const sub = subscriptionService.findByOrg('1');
      expect(sub).not.toBeNull();
      expect(sub.organization_id).toBe(1);

      const plan = subscriptionPlanService.findById('1');
      expect(plan).not.toBeNull();
      expect(plan.plan_id).toBe(1);
    });
  });

  describe('Dynamic Tenant Actor Attribution & Hardcoded ID Elimination', () => {
    it('dynamically resolves appointment creator from tenant without hardcoding ID', () => {
      const created = appointmentService.create({
        patient_id: dataStore.patients[0].patient_id,
        scheduled_datetime: '2029-05-10T10:00:00.000Z',
        organization_id: 1,
      });
      expect(created.created_by).toBeDefined();
      expect(typeof created.created_by).toBe('number');
      const creator = dataStore.users.find((u) => u.user_id === created.created_by);
      expect(creator).toBeDefined();
      expect(creator.organization_id).toBe(1);
    });

    it('dynamically resolves inventory purchase requester without hardcoding ID', () => {
      const created = inventoryService.createRequest({
        item_id: dataStore.inventoryItems[0].item_id,
        quantity_requested: 5,
        organization_id: 1,
      });
      expect(created.requested_by).toBeDefined();
      expect(typeof created.requested_by).toBe('number');
      const requester = dataStore.users.find((u) => u.user_id === created.requested_by);
      expect(requester).toBeDefined();
      expect(requester.organization_id).toBe(1);
    });
  });

  describe('Enum, Casing and Timestamp Invariants', () => {
    it('defaults appointment status to schema enum CONFIRMED', () => {
      const appt = appointmentService.create({
        patient_id: dataStore.patients[0].patient_id,
        scheduled_datetime: '2029-06-15T11:00:00.000Z',
        organization_id: 1,
      });
      expect(appt.status).toBe('CONFIRMED');
    });

    it('defaults insurance coverage_type to schema enum Comprehensive', () => {
      const ins = patientService.createInsurance({
        patient_id: dataStore.patients[0].patient_id,
        provider_name: 'Test Healthcare Shield',
        policy_number: 'TEST-POL-999',
        valid_till: '2028-12-31',
        organization_id: 1,
      });
      expect(ins.coverage_type).toBe('Comprehensive');
    });

    it('title-cases billing payment mode strings consistently', () => {
      const admission = admissionService.create({ patient_id: 201, organization_id: 1, hospital_id: 1 });
      const ledger = billingService.createLedger({ admission_id: admission.admission_id, organization_id: 1, hospital_id: 1 });
      billingService.addLedgerEntry({ ledger_id: ledger.ledger_id, service_id: 1, quantity: 1, unit_price: 100, amount: 100 });
      const p1 = billingService.createPayment({
        ledger_id: ledger.ledger_id,
        amount_paid: 10,
        payment_mode: 'cash',
        idempotency_key: 'phase5-mode-cash',
        organization_id: 1,
      });
      expect(p1.payment_mode).toBe('Cash');

      const p2 = billingService.createPayment({
        ledger_id: ledger.ledger_id,
        amount_paid: 10,
        payment_mode: 'CARD',
        idempotency_key: 'phase5-mode-card',
        organization_id: 1,
      });
      expect(p2.payment_mode).toBe('Card');

      const p3 = billingService.createPayment({
        ledger_id: ledger.ledger_id,
        amount_paid: 10,
        payment_mode: 'upi',
        idempotency_key: 'phase5-mode-upi',
        organization_id: 1,
      });
      expect(p3.payment_mode).toBe('UPI');
    });

    it('creates appointment with valid ISO-8601 scheduled_datetime', () => {
      const appt = appointmentService.create({
        patient_id: dataStore.patients[0].patient_id,
        appointment_date: '2029-11-20',
        appointment_time: '14:30:00',
        organization_id: 1,
      });
      expect(appt.scheduled_datetime).toBeDefined();
      expect(new Date(appt.scheduled_datetime).toISOString()).toBe(appt.scheduled_datetime);
    });
  });

  describe('Schema Integrity & Seed Conformance', () => {
    it('verifies all discharge summary seeds include gross_amount, insurance_deduction, and discharge_notes', () => {
      expect(dataStore.dischargeSummaries.length).toBeGreaterThanOrEqual(7);
      dataStore.dischargeSummaries.slice(0, 7).forEach((ds) => {
        expect(ds.gross_amount).toBeDefined();
        expect(typeof ds.gross_amount).toBe('number');
        expect(ds.insurance_deduction).toBeDefined();
        expect(typeof ds.insurance_deduction).toBe('number');
        expect(ds.discharge_notes).toBeDefined();
        expect(typeof ds.discharge_notes).toBe('string');
        expect(ds.notes).toBeUndefined();
      });
    });

    it('exposes organization_id and hospital_id in authService.toPublicUser', () => {
      const publicUser = authService.toPublicUser({
        user_id: 42,
        name: 'Dr. John Doe',
        email: 'john.doe@hospital.org',
        role_id: 3,
        organization_id: '1',
        hospital_id: '1',
      });
      expect(publicUser.organization_id).toBe(1);
      expect(publicUser.hospital_id).toBe(1);
      expect(publicUser.password).toBeUndefined();
    });

    it('supports custom base offsets in maxId and nextId utilities', () => {
      expect(maxId([], 'admission_id', 701) + 1).toBe(701);
      expect(nextId([], 'admission_id', 701)).toBe(701);

      const items = [{ id: 701 }, { id: 705 }];
      expect(maxId(items, 'id', 701)).toBe(705);
      expect(nextId(items, 'id', 701)).toBe(706);
    });
  });

  describe('Route-Level Validation Middleware', () => {
    it('rejects POST /billing/leaders payloads missing required fields with 400 Bad Request', async () => {
      const loginRes = await request(app)
        .post('/auth/login/hom')
        .send({ email: 'admin.hom@citygen.com', password: 'Hom@123' });
      expect(loginRes.statusCode).toBe(200);
      const cookie = loginRes.headers['set-cookie'];

      const invalidRes = await request(app)
        .post('/billing/leaders')
        .set('Cookie', cookie)
        .send({ quantity: 5 });

      expect(invalidRes.statusCode).toBe(400);
      expect(Array.isArray(invalidRes.body.message)).toBe(true);
      const joined = invalidRes.body.message.join(' ');
      expect(joined).toContain('admission_id');
      expect(joined).toContain('service_id');
    });

    it('accepts valid POST /billing/leaders payload with 201 Created', async () => {
      const loginRes = await request(app)
        .post('/auth/login/hom')
        .send({ email: 'admin.hom@citygen.com', password: 'Hom@123' });
      const cookie = loginRes.headers['set-cookie'];

      const validRes = await request(app)
        .post('/billing/leaders')
        .set('Cookie', cookie)
        .send({
          admission_id: dataStore.admissions[0].admission_id,
          service_id: dataStore.services[0].service_id,
          quantity: 2,
        });

      expect(validRes.statusCode).toBe(201);
      expect(validRes.body.leader_id).toBeDefined();
      expect(validRes.body.status).toBe('PENDING');
    });
  });
});
