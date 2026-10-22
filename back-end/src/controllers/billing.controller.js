'use strict';

const billingService = require('../services/billing.service');
const dataStore = require('../store/dataStore');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const {
  forbidsOtherPatient,
  isPatientSession,
} = require('../utils/patientOwnership');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('💰 Billing');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

function findAllServices(req, res) {
  sendResult(res, scopeToOrg(billingService.findAllServices(), req), 200);
}

function createService(req, res) {
  sendResult(res, billingService.createService(withTenant(req, req.body)), 201);
}

// Raw lookup by admission/ledger id has no per-record ownership check —
// a Patient must go through GET /billing/patient/:patientId/bills
// instead, which is scoped to their own patient_id server-side.
function findLedgerByAdmission(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  const ledger = billingService.findLedgerByAdmission(+req.params.admissionId);
  if (ledger && !belongsToOrg(ledger, req)) return sendResult(res, null, 200);
  sendResult(res, ledger, 200);
}

// HOM's billing-monitoring view (all ledgers, across every patient) —
// same list-all-must-deny-Patient pattern as findAllPayments/
// findAllReceipts below, since there's no single patientId to scope this
// to.
function findAllLedgers(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(billingService.findAllLedgers(), req), 200);
}

function createLedger(req, res) {
  const payload = withTenant(req, req.body);
  const admission = dataStore.admissions.find((a) => Number(a.admission_id) === Number(payload.admission_id));
  if (!belongsToOrg(admission, req)) return res.status(404).json({ message: 'Admission not found in this organization', error: 'Not Found', statusCode: 404 });
  const result = billingService.createLedger(payload);
  logger.log(
    `📔 LEDGER CREATED  id=${result.ledger_id}  admission_id=${result.admission_id}`,
  );
  sendResult(res, result, 201);
}

function findLedgerEntries(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  const ledger = billingService.findLedgerById(+req.params.ledgerId);
  if (ledger && !belongsToOrg(ledger, req)) return sendResult(res, [], 200);
  sendResult(res, billingService.findLedgerEntries(+req.params.ledgerId), 200);
}

function addLedgerEntry(req, res) {
  const payload = withTenant(req, req.body);
  const ledger = billingService.findLedgerById(payload.ledger_id);
  const service = dataStore.services.find((s) => Number(s.service_id) === Number(payload.service_id));
  if (!belongsToOrg(ledger, req) || !belongsToOrg(service, req)) return res.status(404).json({ message: 'Ledger or service not found in this organization', error: 'Not Found', statusCode: 404 });
  const result = billingService.addLedgerEntry(payload);
  logger.log(
    `➕ LEDGER ENTRY ADDED  ledger_id=${result.ledger_id}  service_id=${result.service_id}  amount=${result.amount}`,
  );
  sendResult(res, result, 201);
}

function findAllPayments(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(billingService.findAllPayments(), req), 200);
}

// Phase 2 — a Patient session may only pay off their own ledger (the
// "Pay Now" button on a dispatched bill). FA can record any payment
// (e.g. cash/offline collections). No separate verification step: since
// there's no real payment gateway to confirm asynchronously, the
// triggering call itself is treated as the confirmed payment.
function createPayment(req, res) {
  const ledgerId = Number(req.body.ledger_id);
  const ledger = billingService.findLedgerById(ledgerId);
  const admission =
    ledger &&
    dataStore.admissions.find((a) => a.admission_id === ledger.admission_id);
  if (
    isPatientSession(req) &&
    (!admission || forbidsOtherPatient(req, admission.patient_id))
  ) {
    return res.status(403).json(FORBIDDEN);
  }
  if (ledger && !belongsToOrg(ledger, req))
    return res.status(403).json(FORBIDDEN);

  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 128) {
    return res.status(400).json({ message: 'A valid Idempotency-Key header is required', error: 'Bad Request', statusCode: 400 });
  }
  const result = billingService.createPayment({
    ...withTenant(req, req.body),
    idempotency_key: idempotencyKey,
  });
  logger.log(
    `💳 PAYMENT CREATED  id=${result.payment_id}  ledger_id=${result.ledger_id}  amount=${result.amount_paid}`,
  );
  sendResult(res, result, 201);
}

function createSummary(req, res) {
  const payload = withTenant(req, req.body);
  const admission = dataStore.admissions.find((a) => Number(a.admission_id) === Number(payload.admission_id));
  if (!belongsToOrg(admission, req) || Number(admission.patient_id) !== Number(payload.patient_id)) return res.status(404).json({ message: 'Admission and patient do not match this organization', error: 'Not Found', statusCode: 404 });
  const result = billingService.createDischargeSummary(payload);
  logger.log(
    `📄 DISCHARGE SUMMARY CREATED  id=${result.summary_id}  admission_id=${result.admission_id}`,
  );
  sendResult(res, result, 201);
}

function dispatchLedger(req, res) {
  const ledger = billingService.findLedgerById(+req.params.id);
  if (ledger && !belongsToOrg(ledger, req))
    return res.status(403).json(FORBIDDEN);
  const result = billingService.dispatchLedger(+req.params.id);
  if (result) logger.log(`📤 LEDGER DISPATCHED  id=${result.ledger_id}`);
  sendResult(res, result, 200);
}

// Staff callers aren't ownership-restricted to one patient (by design —
// they see across patients within their own org), so unlike the Patient
// path above, a cross-org leak here would come from a staff session
// simply guessing another org's patientId. Check the target patient's own
// organization_id against the caller's tenant to close that gap.
function targetPatientForbidden(req, patientId) {
  if (forbidsOtherPatient(req, patientId)) return true;
  if (isPatientSession(req)) return false; // already ownership-checked above
  const patient = dataStore.patients.find((p) => p.patient_id === patientId);
  return Boolean(patient && !belongsToOrg(patient, req));
}

function findPatientBills(req, res) {
  const patientId = +req.params.patientId;
  if (targetPatientForbidden(req, patientId)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, billingService.findPatientBills(patientId), 200);
}

function findAllReceipts(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(billingService.findAllReceipts(), req), 200);
}

function findReceiptsByPatient(req, res) {
  const patientId = +req.params.patientId;
  if (targetPatientForbidden(req, patientId)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, billingService.findReceiptsByPatient(patientId), 200);
}

function findDischargeSummary(req, res) {
  const result = billingService.findDischargeSummaryByAdmission(
    +req.params.admissionId,
  );
  if (
    result &&
    (forbidsOtherPatient(req, result.patient_id) || !belongsToOrg(result, req))
  ) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, result, 200);
}

function findAllLeaders(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(billingService.findAllLeaders(), req), 200);
}

function createLeader(req, res) {
  const payload = withTenant(req, req.body);
  const admission = dataStore.admissions.find((a) => Number(a.admission_id) === Number(payload.admission_id));
  const service = dataStore.services.find((s) => Number(s.service_id) === Number(payload.service_id));
  if (admission && !belongsToOrg(admission, req)) return res.status(404).json({ message: 'Admission not found in this organization', error: 'Not Found', statusCode: 404 });
  if (admission && service && !belongsToOrg(service, req)) return res.status(404).json({ message: 'Service not found in this organization', error: 'Not Found', statusCode: 404 });
  const result = billingService.createLeader(payload);
  logger.log(
    `⭐ LEADER CREATED  id=${result.leader_id}  admission_id=${result.admission_id}  service_id=${result.service_id}`,
  );
  sendResult(res, result, 201);
}

function approveLeader(req, res) {
  const leaderId = +req.params.id;
  const existing = billingService.findLeaderById(leaderId);
  if (existing && !belongsToOrg(existing, req)) {
    return res.status(403).json(FORBIDDEN);
  }
  const result = billingService.approveLeader(leaderId);
  if (result.error === 'NOT_FOUND') {
    return res.status(404).json({ message: result.message, error: 'Not Found', statusCode: 404 });
  }
  if (result.error === 'ALREADY_APPROVED') {
    return res.status(400).json({ message: result.message, error: 'Bad Request', statusCode: 400, leader: result.leader });
  }
  logger.log(`⭐ LEADER APPROVED  id=${result.leader.leader_id}  ledger_id=${result.ledger.ledger_id}`);
  sendResult(res, result, 200);
}

function getBillingRoot(req, res) {
  const rawPatientId = req.query.patient_id || req.query.patientId;
  const patientId = rawPatientId ? Number(rawPatientId) : null;
  if (patientId) {
    if (targetPatientForbidden(req, patientId)) return res.status(403).json(FORBIDDEN);
    return sendResult(res, billingService.findPatientBills(patientId), 200);
  }
  if (isPatientSession(req)) {
    return sendResult(res, billingService.findPatientBills(req.session.patientId), 200);
  }
  sendResult(res, scopeToOrg(billingService.findAllLedgers(), req), 200);
}

module.exports = {
  getBillingRoot,
  findAllServices,
  createService,
  findLedgerByAdmission,
  findAllLedgers,
  createLedger,
  findLedgerEntries,
  addLedgerEntry,
  findAllPayments,
  createPayment,
  createSummary,
  dispatchLedger,
  findPatientBills,
  findAllReceipts,
  findReceiptsByPatient,
  findDischargeSummary,
  findAllLeaders,
  createLeader,
  approveLeader,
};
