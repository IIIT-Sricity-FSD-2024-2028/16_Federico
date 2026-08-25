'use strict';

const provisioningService = require('../services/provisioning.service');
const authService = require('../services/auth.service');
const preRequestService = require('../services/preRequest.service');
const wardService = require('../services/ward.service');
const admissionService = require('../services/admission.service');
const billingService = require('../services/billing.service');
const dataStore = require('../store/dataStore');

describe('E2E Hospital Patient Lifecycle & Multi-Tenancy Pipeline', () => {
  let tenantOrg;
  let patientSession;
  let preSession;
  let homSession;
  let faSession;
  let allocatedBedId;
  let preRequestId;
  let admissionId;
  let ledgerId;
  let leaderId;

  beforeAll(() => {
    // 1. Provision new multi-tenant organization
    const provisionResult = provisioningService.provision({
      name: 'City Care Hospital',
      plan_id: 2, // Growth plan
      contact: { phone: '+919876543210', email: 'contact@citycare.com', address: 'MG Road, Bangalore' },
      specialties: ['Cardiology', 'Orthopedics', 'General Medicine'],
      emergency_available: true,
      admin_name: 'CityCare Owner',
      admin_email: 'admin@citycare.com',
      admin_password: 'Password@123',
    });

    tenantOrg = provisionResult.organization;
    expect(tenantOrg).toBeDefined();
    expect(tenantOrg.organization_id).toBeGreaterThan(0);

    // Create staff accounts for the organization
    authService.signup({
      name: 'PRE Nurse John',
      email: 'pre.john@citycare.com',
      password: 'Password@123',
      phone: '+919876500001',
      organization_id: tenantOrg.organization_id,
    });
    // Upgrade user role to PRE
    const userPre = dataStore.users.find((u) => u.email === 'pre.john@citycare.com');
    userPre.role_id = 3; // PRE

    authService.signup({
      name: 'HOM Officer Sarah',
      email: 'hom.sarah@citycare.com',
      password: 'Password@123',
      phone: '+919876500002',
      organization_id: tenantOrg.organization_id,
    });
    const userHom = dataStore.users.find((u) => u.email === 'hom.sarah@citycare.com');
    userHom.role_id = 4; // HOM

    authService.signup({
      name: 'FA Accountant Mike',
      email: 'fa.mike@citycare.com',
      password: 'Password@123',
      phone: '+919876500003',
      organization_id: tenantOrg.organization_id,
    });
    const userFa = dataStore.users.find((u) => u.email === 'fa.mike@citycare.com');
    userFa.role_id = 1; // FA

    // 2. Authenticate all roles
    preSession = authService.login('pre.john@citycare.com', 'Password@123', tenantOrg.organization_id);
    homSession = authService.login('hom.sarah@citycare.com', 'Password@123', tenantOrg.organization_id);
    faSession = authService.login('fa.mike@citycare.com', 'Password@123', tenantOrg.organization_id);

    expect(preSession.token).toBeDefined();
    expect(homSession.token).toBeDefined();
    expect(faSession.token).toBeDefined();
  });

  it('Step 1: Patient signs up and registers in tenant organization', () => {
    const signupResult = authService.signup({
      name: 'Alice Patient',
      email: 'alice.patient@gmail.com',
      password: 'Password@123',
      phone: '+919876543299',
      dob: '1992-05-15',
      gender: 'Female',
      blood_group: 'O+',
      address: 'Indiranagar, Bangalore',
      emergency_contact_name: 'Bob Patient',
      emergency_contact_phone: '+919876543298',
      organization_id: tenantOrg.organization_id,
    });

    expect(signupResult.token).toBeDefined();
    expect(signupResult.patient.uhid).toMatch(/^UHID-[A-Z0-9]+$/);
    patientSession = signupResult;
  });

  it('Step 2: Patient submits pre-registration intake request', () => {
    const preRequest = preRequestService.create(
      {
        patient_id: patientSession.patient.patient_id,
        department: 'General Medicine',
        visit_type: 'Admit',
        ward_type: 'General Ward',
        requested_date: '2026-09-01',
        requested_time: '10:00 AM',
        organization_id: tenantOrg.organization_id,
      },
      patientSession.user.user_id,
    );

    expect(preRequest.pre_request_id).toBeDefined();
    expect(preRequest.status).toBe('PENDING');
    preRequestId = preRequest.pre_request_id;
  });

  it('Step 3: PRE operator reviews and approves the pre-request', () => {
    expect(preRequestService.canTransition('PENDING', 'APPROVED', 'PRE')).toBe(true);

    const updated = preRequestService.transition(preRequestId, 'APPROVED', 'PRE');
    expect(updated.status).toBe('APPROVED');
    expect(updated.hom_status).toBe('Awaiting visit type / bed request');
  });

  it('Step 4: PRE submits a bed allocation request', () => {
    const beds = wardService.findAllBeds().filter((b) => b.organization_id === tenantOrg.organization_id);
    const availableBed = beds.find((b) => b.status === 'AVAILABLE');
    expect(availableBed).toBeDefined();
    allocatedBedId = availableBed.bed_id;

    const bedRequest = wardService.createBedRequest(
      {
        pre_request_id: preRequestId,
        patient_id: patientSession.patient.patient_id,
        ward_id: availableBed.ward_id,
        priority: 'NORMAL',
        organization_id: tenantOrg.organization_id,
      },
      preSession.user.user_id,
    );

    expect(bedRequest.bed_request_id).toBeDefined();
    expect(bedRequest.status).toBe('PENDING');

    // HOM allocates the bed
    const allocated = wardService.updateBedRequest(bedRequest.bed_request_id, {
      bed_id: allocatedBedId,
    });
    expect(allocated.status).toBe('ALLOCATED');

    // Verify bed is now marked OCCUPIED
    const bed = dataStore.beds.find((b) => b.bed_id === allocatedBedId);
    expect(bed.status).toBe('OCCUPIED');

    // Pre-request transitioned to ADMITTED
    const updatedPre = preRequestService.transition(preRequestId, 'ADMITTED', 'HOM', {
      bed_id: allocatedBedId,
    });
    expect(updatedPre.status).toBe('ADMITTED');

    // Admission record and billing ledger auto-created
    const admission = admissionService.create({
      patient_id: patientSession.patient.patient_id,
      bed_id: allocatedBedId,
      status: 'ADMITTED',
      organization_id: tenantOrg.organization_id,
    });
    expect(admission.admission_id).toBeDefined();
    admissionId = admission.admission_id;

    const ledger = billingService.createLedger({
      admission_id: admissionId,
      status: 'OPEN',
      organization_id: tenantOrg.organization_id,
    });
    expect(ledger.ledger_id).toBeDefined();
    ledgerId = ledger.ledger_id;
  });

  it('Step 5: HOM logs clinical service usage (Leader) and FA approves into ledger', () => {
    // Create a clinical service
    const service = billingService.createService({
      service_name: 'ICU Monitoring & Nursing',
      category: 'Inpatient Care',
      base_cost: 2500,
      organization_id: tenantOrg.organization_id,
    });

    // HOM logs Leader usage
    const leader = billingService.createLeader({
      admission_id: admissionId,
      patient_id: patientSession.patient.patient_id,
      service_id: service.service_id,
      quantity: 2,
      organization_id: tenantOrg.organization_id,
    });

    expect(leader.leader_id).toBeDefined();
    expect(leader.status).toBe('PENDING');
    expect(leader.amount).toBe(5000); // 2500 * 2
    leaderId = leader.leader_id;

    // FA reviews and approves the Leader
    const approveResult = billingService.approveLeader(leaderId);
    expect(approveResult.success).toBe(true);
    expect(approveResult.leader.status).toBe('APPROVED');
    expect(approveResult.ledgerEntry.amount).toBe(5000);

    // Verify ledger has the entry
    const entries = billingService.findLedgerEntries(ledgerId);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries.some((e) => e.service_id === service.service_id)).toBe(true);
  });

  it('Step 6: FA dispatches bill and records patient payment', () => {
    // FA dispatches ledger to patient
    const dispatched = billingService.dispatchLedger(ledgerId);
    expect(dispatched.status).toBe('DISPATCHED');

    // Payment is recorded
    const payment = billingService.createPayment({
      ledger_id: ledgerId,
      amount_paid: 5000,
      payment_mode: 'UPI',
      organization_id: tenantOrg.organization_id,
    });

    expect(payment.payment_id).toBeDefined();

    // Verify ledger marked PAID
    const paidLedger = billingService.findLedgerById(ledgerId);
    expect(paidLedger.status).toBe('PAID');

    // Verify admission marked PAYMENT_CONFIRMED
    const admission = admissionService.findOne(admissionId);
    expect(admission.status).toBe('PAYMENT_CONFIRMED');

    // Verify receipt generated
    const receipts = billingService.findAllReceipts();
    const patientReceipt = receipts.find((r) => r.admission_id === admissionId);
    expect(patientReceipt).toBeDefined();
    expect(patientReceipt.amount).toBe(5000);
  });

  it('Step 7: Discharge coordination and PRE final sign-off frees the bed', () => {
    // PRE requests discharge
    expect(preRequestService.canTransition('ADMITTED', 'DISCHARGE_REQUESTED', 'PRE')).toBe(true);
    const dischargeReq = preRequestService.transition(preRequestId, 'DISCHARGE_REQUESTED', 'PRE');
    expect(dischargeReq.status).toBe('DISCHARGE_REQUESTED');

    // HOM approves discharge
    expect(preRequestService.canTransition('DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED', 'HOM')).toBe(true);
    const dischargeApp = preRequestService.transition(preRequestId, 'DISCHARGE_APPROVED', 'HOM');
    expect(dischargeApp.status).toBe('DISCHARGE_APPROVED');

    // PRE gives final discharge sign-off
    expect(preRequestService.canTransition('DISCHARGE_APPROVED', 'DISCHARGED', 'PRE')).toBe(true);
    const discharged = preRequestService.transition(preRequestId, 'DISCHARGED', 'PRE');
    expect(discharged.status).toBe('DISCHARGED');

    // Physical bed MUST now be freed back to AVAILABLE
    const bed = dataStore.beds.find((b) => b.bed_id === allocatedBedId);
    expect(bed.status).toBe('AVAILABLE');

    // Admission record MUST be marked DISCHARGED
    const finalAdmission = admissionService.findOne(admissionId);
    expect(finalAdmission.status).toBe('DISCHARGED');
  });
});
