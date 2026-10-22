'use strict';

const dataStore = require('../store/dataStore');
const admissionController = require('../controllers/admission.controller');
const appointmentController = require('../controllers/appointment.controller');
const billingController = require('../controllers/billing.controller');
const patientController = require('../controllers/patient.controller');
const inventoryController = require('../controllers/inventory.controller');

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('tenant-scoped create reference validation', () => {
  const req = (body) => ({ body, tenant: { organizationId: 1, hospitalId: 1 }, session: { role: 'ADMIN' } });

  it('rejects an admission referencing a patient from another organization without writing', () => {
    const foreignPatient = dataStore.patients.find((patient) => Number(patient.organization_id) === 2);
    const before = dataStore.admissions.length;
    const res = responseRecorder();
    admissionController.create(req({ patient_id: foreignPatient.patient_id, bed_id: 11 }), res);
    expect(res.statusCode).toBe(404);
    expect(dataStore.admissions).toHaveLength(before);
  });

  it('rejects an appointment referencing a patient from another organization without writing', () => {
    const foreignPatient = dataStore.patients.find((patient) => Number(patient.organization_id) === 2);
    const before = dataStore.appointments.length;
    const res = responseRecorder();
    appointmentController.create(req({ patient_id: foreignPatient.patient_id }), res);
    expect(res.statusCode).toBe(404);
    expect(dataStore.appointments).toHaveLength(before);
  });

  it('rejects an appointment referencing a doctor from another organization without writing', () => {
    const patient = dataStore.patients.find((record) => Number(record.organization_id) === 1);
    const foreignDoctor = dataStore.doctors.find((record) => Number(record.organization_id) === 2);
    const before = dataStore.appointments.length;
    const res = responseRecorder();
    appointmentController.create(req({ patient_id: patient.patient_id, doctor_id: foreignDoctor.doctor_id }), res);
    expect(res.statusCode).toBe(404);
    expect(dataStore.appointments).toHaveLength(before);
  });

  it('rejects a ledger entry referencing another organization’s ledger without writing', () => {
    const foreignLedger = dataStore.ledgers.find((ledger) => Number(ledger.organization_id) === 2);
    const before = dataStore.ledgerEntries.length;
    const res = responseRecorder();
    billingController.addLedgerEntry(req({ ledger_id: foreignLedger.ledger_id, service_id: 1, quantity: 1, unit_price: 1 }), res);
    expect(res.statusCode).toBe(404);
    expect(dataStore.ledgerEntries).toHaveLength(before);
  });

  it('rejects a billing leader referencing another organization’s admission without writing', () => {
    const foreignAdmission = dataStore.admissions.find((record) => Number(record.organization_id) === 2);
    const before = dataStore.leaders.length;
    const res = responseRecorder();
    billingController.createLeader(req({ admission_id: foreignAdmission.admission_id, service_id: 1 }), res);
    expect(res.statusCode).toBe(404);
    expect(dataStore.leaders).toHaveLength(before);
  });

  it('rejects insurance creation for another organization’s patient without writing', () => {
    const foreignPatient = dataStore.patients.find((patient) => Number(patient.organization_id) === 2);
    const before = dataStore.patientInsurances.length;
    const res = responseRecorder();
    patientController.createInsurance(req({ patient_id: foreignPatient.patient_id, provider_name: 'Test', policy_number: 'FOREIGN' }), res);
    expect(res.statusCode).toBe(404);
    expect(dataStore.patientInsurances).toHaveLength(before);
  });

  it('rejects a discharge summary whose patient does not match its admission', () => {
    const admission = dataStore.admissions.find((item) => Number(item.organization_id) === 1);
    const before = dataStore.dischargeSummaries.length;
    const res = responseRecorder();
    billingController.createSummary(req({ admission_id: admission.admission_id, patient_id: admission.patient_id + 1 }), res);
    expect(res.statusCode).toBe(404);
    expect(dataStore.dischargeSummaries).toHaveLength(before);
  });

  it('rejects an inventory item update pointing at another organization’s service without mutation', () => {
    const item = dataStore.inventoryItems.find((record) => Number(record.organization_id) === 1);
    const foreignService = dataStore.services.find((record) => Number(record.organization_id) === 2);
    const before = { ...item };
    const res = responseRecorder();
    inventoryController.updateItem({ ...req({ service_id: foreignService.service_id }), params: { id: String(item.item_id) } }, res);
    expect(res.statusCode).toBe(404);
    expect(item).toEqual(before);
  });

  it('rejects a purchase request from a requester in another organization without writing', () => {
    const item = dataStore.inventoryItems.find((record) => Number(record.organization_id) === 1);
    const foreignRequester = dataStore.users.find((record) => Number(record.organization_id) === 2);
    const before = dataStore.purchaseRequests.length;
    const res = responseRecorder();
    inventoryController.createRequest(req({
      item_id: item.item_id,
      quantity_requested: 2,
      requested_by: foreignRequester.user_id,
      status: 'PENDING',
    }), res);
    expect(res.statusCode).toBe(404);
    expect(dataStore.purchaseRequests).toHaveLength(before);
  });

  it('accepts the frontend purchase request payload when its requester belongs to the tenant', () => {
    const item = dataStore.inventoryItems.find((record) => Number(record.organization_id) === 1);
    const requester = dataStore.users.find((record) => Number(record.organization_id) === 1);
    const res = responseRecorder();
    inventoryController.createRequest(req({
      item_id: item.item_id,
      quantity_requested: 2,
      requested_by: requester.user_id,
      status: 'PENDING',
      supplier: 'Test supplier',
      priority: 'normal',
      notes: 'Contract compatibility test',
      invoice_url: null,
    }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.item_id).toBe(item.item_id);
    expect(res.body.requested_by).toBe(requester.user_id);
    expect(res.body.organization_id).toBe(1);
    dataStore.purchaseRequests = dataStore.purchaseRequests.filter(
      (record) => record.request_id !== res.body.request_id,
    );
  });
});
