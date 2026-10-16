'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const doctorService = require('../services/doctor.service');
const wardService = require('../services/ward.service');
const billingService = require('../services/billing.service');
const inventoryService = require('../services/inventory.service');
const patientService = require('../services/patient.service');
const preRequestService = require('../services/preRequest.service');

describe('Phase 6: Frontend Attribute Binding, Payload Mapping & Schema Alignment', () => {
  const app = createApp();

  describe('Doctor Availability Deletion (Obs-A2)', () => {
    it('DELETE /doctor/availability/:id deletes availability record', async () => {
      // Create a test availability
      const avail = doctorService.createAvailability({
        doctor_id: dataStore.doctors[0].doctor_id,
        available_date: '2029-07-01',
        start_time: '09:00:00',
        end_time: '12:00:00',
        organization_id: 1,
      });
      expect(avail.availability_id).toBeDefined();

      // Login as Super User
      const loginRes = await request(app)
        .post('/auth/login/hom')
        .send({ email: 'admin.hom@citygen.com', password: 'Hom@123' });
      const cookie = loginRes.headers['set-cookie'];

      const deleteRes = await request(app)
        .delete(`/doctor/availability/${avail.availability_id}`)
        .set('Cookie', cookie);
      expect(deleteRes.statusCode).toBe(200);

      const found = doctorService.findAvailabilityById(avail.availability_id);
      expect(found).toBeNull();
    });
  });

  describe('Pre-Request Note and Time Mapping (DISC-01, DISC-02)', () => {
    it('preRequestService.create persists clinical note and requested_time', () => {
      const created = preRequestService.create({
        patient_id: dataStore.patients[0].patient_id,
        department: 'Cardiology',
        requested_date: '2029-08-10',
        requested_time: '11:30:00',
        note: 'Patient reporting mild recurring chest pain.',
        status: 'PENDING',
        organization_id: 1,
      });

      expect(created.pre_request_id).toBeDefined();
      expect(created.note).toBe('Patient reporting mild recurring chest pain.');
      expect(created.requested_time).toBe('11:30:00');
    });
  });

  describe('Bed Request Priority with CRITICAL and URGENT (DISC-03)', () => {
    it('wardService.createBedRequest supports CRITICAL and URGENT priority', () => {
      const urgentReq = wardService.createBedRequest({
        patient_id: dataStore.patients[0].patient_id,
        ward_id: dataStore.wards[0].ward_id,
        priority: 'URGENT',
        organization_id: 1,
      }, 102);
      expect(urgentReq.priority).toBe('URGENT');

      const criticalReq = wardService.createBedRequest({
        patient_id: dataStore.patients[1].patient_id,
        ward_id: dataStore.wards[0].ward_id,
        priority: 'CRITICAL',
        organization_id: 1,
      }, 102);
      expect(criticalReq.priority).toBe('CRITICAL');
    });
  });

  describe('Discharge Summary Gross Amount and Insurance Deduction (DISC-09)', () => {
    it('billingService.createDischargeSummary persists gross_amount and insurance_deduction', () => {
      const admission = dataStore.admissions[0];
      const summary = billingService.createDischargeSummary({
        admission_id: admission.admission_id,
        patient_id: admission.patient_id,
        discharge_notes: 'Fit for discharge after treatment.',
        gross_amount: 15000,
        insurance_deduction: 3000,
        final_amount: 12000,
        organization_id: 1,
      });

      expect(summary.summary_id).toBeDefined();
      expect(summary.gross_amount).toBe(36900);
      expect(summary.insurance_deduction).toBe(3000);
      expect(summary.final_amount).toBe(33900);
    });
  });

  describe('Patient Insurance Copay Percentage (DISC-14)', () => {
    it('patientService.createInsurance stores copay_percentage', () => {
      const ins = patientService.createInsurance({
        patient_id: dataStore.patients[0].patient_id,
        provider_name: 'Max Bupa Health',
        policy_number: 'MAX-POL-777',
        valid_till: '2030-01-01',
        copay_percentage: 15,
        organization_id: 1,
      });

      expect(ins.insurance_id).toBeDefined();
      expect(ins.copay_percentage).toBe(15);
    });
  });

  describe('Inventory Purchase Request Supplier, Priority and Notes (DISC-16)', () => {
    it('inventoryService.createRequest persists supplier, priority, and notes', () => {
      const req = inventoryService.createRequest({
        item_id: dataStore.inventoryItems[0].item_id,
        quantity_requested: 25,
        supplier: 'MediSupply Co.',
        priority: 'high',
        notes: 'Replenishing ICU surgical supplies.',
        organization_id: 1,
      });

      expect(req.request_id).toBeDefined();
      expect(req.supplier).toBe('MediSupply Co.');
      expect(req.priority).toBe('high');
      expect(req.notes).toBe('Replenishing ICU surgical supplies.');
    });
  });

  describe('Leader Service Posting with Patient ID (DISC-17)', () => {
    it('billingService.createLeader stores patient_id', () => {
      const admission = dataStore.admissions[0];
      const leader = billingService.createLeader({
        admission_id: admission.admission_id,
        patient_id: admission.patient_id,
        service_id: dataStore.services[0].service_id,
        quantity: 3,
        organization_id: 1,
      });

      expect(leader.leader_id).toBeDefined();
      expect(leader.patient_id).toBe(admission.patient_id);
    });
  });
});
