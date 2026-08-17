'use strict';

const billingService = require('../services/billing.service');
const dataStore = require('../store/dataStore');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { forbidsOtherPatient, isPatientSession } = require('../utils/patientOwnership');

const logger = createLogger('💰 Billing');
const FORBIDDEN = { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 };

function findAllServices(req, res) {
  sendResult(res, billingService.findAllServices(), 200);
}

function createService(req, res) {
  sendResult(res, billingService.createService(req.body), 201);
}

// Raw lookup by admission/ledger id has no per-record ownership check —
// a Patient must go through GET /billing/patient/:patientId/bills
// instead, which is scoped to their own patient_id server-side.
function findLedgerByAdmission(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, billingService.findLedgerByAdmission(+req.params.admissionId), 200);
}

// HOM's billing-monitoring view (all ledgers, across every patient) —
// same list-all-must-deny-Patient pattern as findAllPayments/
// findAllReceipts below, since there's no single patientId to scope this
// to.
function findAllLedgers(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, billingService.findAllLedgers(), 200);
}

function createLedger(req, res) {
  const result = billingService.createLedger(req.body);
  logger.log(`📔 LEDGER CREATED  id=${result.ledger_id}  admission_id=${result.admission_id}`);
  sendResult(res, result, 201);
}

function findLedgerEntries(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, billingService.findLedgerEntries(+req.params.ledgerId), 200);
}

function addLedgerEntry(req, res) {
  const result = billingService.addLedgerEntry(req.body);
  logger.log(`➕ LEDGER ENTRY ADDED  ledger_id=${result.ledger_id}  service_id=${result.service_id}  amount=${result.amount}`);
  sendResult(res, result, 201);
}

function findAllPayments(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, billingService.findAllPayments(), 200);
}

// Phase 2 — a Patient session may only pay off their own ledger (the
// "Pay Now" button on a dispatched bill). FA can record any payment
// (e.g. cash/offline collections). No separate verification step: since
// there's no real payment gateway to confirm asynchronously, the
// triggering call itself is treated as the confirmed payment.
function createPayment(req, res) {
  const ledger = billingService.findLedgerById(req.body.ledger_id);
  const admission = ledger && dataStore.admissions.find((a) => a.admission_id === ledger.admission_id);
  if (isPatientSession(req) && (!admission || forbidsOtherPatient(req, admission.patient_id))) {
    return res.status(403).json(FORBIDDEN);
  }

  const result = billingService.createPayment(req.body);
  logger.log(`💳 PAYMENT CREATED  id=${result.payment_id}  ledger_id=${result.ledger_id}  amount=${result.amount_paid}`);
  sendResult(res, result, 201);
}

function createSummary(req, res) {
  const result = billingService.createDischargeSummary(req.body);
  logger.log(`📄 DISCHARGE SUMMARY CREATED  id=${result.summary_id}  admission_id=${result.admission_id}`);
  sendResult(res, result, 201);
}

function dispatchLedger(req, res) {
  const result = billingService.dispatchLedger(+req.params.id);
  if (result) logger.log(`📤 LEDGER DISPATCHED  id=${result.ledger_id}`);
  sendResult(res, result, 200);
}

function findPatientBills(req, res) {
  const patientId = +req.params.patientId;
  if (forbidsOtherPatient(req, patientId)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, billingService.findPatientBills(patientId), 200);
}

function findAllReceipts(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, billingService.findAllReceipts(), 200);
}

function findReceiptsByPatient(req, res) {
  const patientId = +req.params.patientId;
  if (forbidsOtherPatient(req, patientId)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, billingService.findReceiptsByPatient(patientId), 200);
}

function findDischargeSummary(req, res) {
  const result = billingService.findDischargeSummaryByAdmission(+req.params.admissionId);
  if (result && forbidsOtherPatient(req, result.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, result, 200);
}

module.exports = {
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
};
