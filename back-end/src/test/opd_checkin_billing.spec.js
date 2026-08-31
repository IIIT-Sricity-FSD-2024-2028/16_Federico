'use strict';

const provisioningService = require('../services/provisioning.service');
const patientService = require('../services/patient.service');
const preRequestService = require('../services/preRequest.service');
const billingService = require('../services/billing.service');
const dataStore = require('../store/dataStore');

describe('Outpatient (OPD) Check-in & Automated Ledger Creation', () => {
  let tenantOrg;
  let patient;
  let preRequest;

  beforeAll(() => {
    // 1. Provision a test hospital
    const provisionResult = provisioningService.provision({
      name: 'Metro Health OPD Care',
      plan_id: 1,
      contact: { phone: '+919876599999', email: 'contact@metrohealth.com', address: 'Indiranagar, Bangalore' },
      specialties: ['General Medicine'],
      emergency_available: true,
      admin_name: 'Metro Admin',
      admin_email: 'admin@metrohealth.com',
      admin_password: 'Password@123',
    });
    tenantOrg = provisionResult.organization;

    // 2. Register an outpatient
    patient = patientService.create({
      name: 'Rahul Outpatient',
      age: 28,
      gender: 'Male',
      contact: '+919876544444',
      uhid: 'UHID-OPD-101',
      organization_id: tenantOrg.organization_id,
      hospital_id: tenantOrg.hospital_id,
    });

    // 3. Book an appointment / pre-request
    preRequest = preRequestService.create({
      patient_id: patient.patient_id,
      department: 'General Medicine',
      requested_date: '2026-09-01',
      requested_time: '10:30 AM',
      organization_id: tenantOrg.organization_id,
      hospital_id: tenantOrg.hospital_id,
    });
  });

  test('Pre-request is created in PENDING status without any ledger opened', () => {
    expect(preRequest.status).toBe('PENDING');
    const existingLedger = dataStore.ledgers.find((l) => l.patient_id === patient.patient_id);
    expect(existingLedger).toBeUndefined();
  });

  test('PRE Approves the appointment schedule (Still no ledger before arrival)', () => {
    const updated = preRequestService.transition(preRequest.pre_request_id, 'APPROVED', 'PRE');
    expect(updated.status).toBe('APPROVED');
    // Verify no ledger created on pure scheduling
    const existingLedger = dataStore.ledgers.find((l) => l.patient_id === patient.patient_id);
    expect(existingLedger).toBeUndefined();
  });

  test('Patient physically arrives -> PRE checks in as OPD -> Auto-creates Admission, OPEN Ledger, and Consultation charge', () => {
    const checkInResult = preRequestService.checkIn(
      preRequest.pre_request_id,
      { visit_type: 'OPD' },
      tenantOrg.organization_id,
      tenantOrg.hospital_id,
      'PRE',
    );

    expect(checkInResult).toBeDefined();
    expect(checkInResult.preRequest.status).toBe('CONSULTATION_DONE');
    expect(checkInResult.preRequest.visit_type).toBe('OPD');

    // Verify Admission created
    expect(checkInResult.admission).toBeDefined();
    expect(checkInResult.admission.visit_type).toBe('OPD');
    expect(checkInResult.admission.status).toBe('ADMITTED');
    expect(checkInResult.admission.patient_id).toBe(patient.patient_id);

    // Verify Ledger created
    expect(checkInResult.ledger).toBeDefined();
    expect(checkInResult.ledger.status).toBe('OPEN');
    expect(checkInResult.ledger.admission_id).toBe(checkInResult.admission.admission_id);

    // Verify Consultation line item automatically posted
    const entries = billingService.findLedgerEntries(checkInResult.ledger.ledger_id);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].quantity).toBe(1);
    expect(Number(entries[0].amount)).toBeGreaterThan(0);
  });
});
