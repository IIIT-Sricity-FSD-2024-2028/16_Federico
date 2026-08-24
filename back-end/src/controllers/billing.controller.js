'use strict';

const billingService = require('../services/billing.service');
const { patientRepository, admissionRepository } = require('../repositories');
const { createLogger } = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError, NotFoundError, ValidationError } = require('../errors');
const {
  forbidsOtherPatient,
  isPatientSession,
} = require('../utils/patientOwnership');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('💰 Billing');

function findAllServices(req, res) {
  sendSuccess(res, scopeToOrg(billingService.findAllServices(), req), 200);
}

function createService(req, res) {
  sendSuccess(res, billingService.createService(withTenant(req, req.body)), 201);
}

function findLedgerByAdmission(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  const ledger = billingService.findLedgerByAdmission(+req.params.admissionId);
  if (ledger && !belongsToOrg(ledger, req)) return sendSuccess(res, null, 200);
  sendSuccess(res, ledger, 200);
}

function findAllLedgers(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, scopeToOrg(billingService.findAllLedgers(), req), 200);
}

function createLedger(req, res) {
  try {
    const result = billingService.createLedger(withTenant(req, req.body));
    logger.log(
      `📔 LEDGER CREATED  id=${result.ledger_id}  admission_id=${result.admission_id}`,
    );
    sendSuccess(res, result, 201);
  } catch (err) {
    sendError(res, err, err.statusCode || 400);
  }
}

function findLedgerEntries(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  const ledger = billingService.findLedgerById(+req.params.ledgerId);
  if (ledger && !belongsToOrg(ledger, req)) return sendSuccess(res, [], 200);
  sendSuccess(res, billingService.findLedgerEntries(+req.params.ledgerId), 200);
}

function addLedgerEntry(req, res) {
  try {
    const result = billingService.addLedgerEntry(withTenant(req, req.body));
    logger.log(
      `➕ LEDGER ENTRY ADDED  ledger_id=${result.ledger_id}  service_id=${result.service_id}  amount=${result.amount}`,
    );
    sendSuccess(res, result, 201);
  } catch (err) {
    sendError(res, err, err.statusCode || 400);
  }
}

function findAllPayments(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, scopeToOrg(billingService.findAllPayments(), req), 200);
}

function createPayment(req, res) {
  const ledger = billingService.findLedgerById(req.body.ledger_id);
  const admission = ledger && admissionRepository.findById(ledger.admission_id);
  if (
    isPatientSession(req) &&
    (!admission || forbidsOtherPatient(req, admission.patient_id))
  ) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  if (ledger && !belongsToOrg(ledger, req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }

  try {
    const result = billingService.createPayment(withTenant(req, req.body));
    logger.log(
      `💳 PAYMENT CREATED  id=${result.payment_id}  ledger_id=${result.ledger_id}  amount=${result.amount_paid}`,
    );
    sendSuccess(res, result, 201);
  } catch (err) {
    sendError(res, err, err.statusCode || 400);
  }
}

function createSummary(req, res) {
  try {
    const result = billingService.createDischargeSummary(
      withTenant(req, req.body),
    );
    logger.log(
      `📄 DISCHARGE SUMMARY CREATED  id=${result.summary_id}  admission_id=${result.admission_id}`,
    );
    sendSuccess(res, result, 201);
  } catch (err) {
    sendError(res, err, err.statusCode || 400);
  }
}

function dispatchLedger(req, res) {
  const ledger = billingService.findLedgerById(+req.params.id);
  if (ledger && !belongsToOrg(ledger, req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  const result = billingService.dispatchLedger(+req.params.id);
  if (result) logger.log(`📤 LEDGER DISPATCHED  id=${result.ledger_id}`);
  sendSuccess(res, result, 200);
}

function targetPatientForbidden(req, patientId) {
  if (forbidsOtherPatient(req, patientId)) return true;
  if (isPatientSession(req)) return false;
  const patient = patientRepository.findById(patientId);
  return Boolean(patient && !belongsToOrg(patient, req));
}

function findPatientBills(req, res) {
  const patientId = +req.params.patientId;
  if (targetPatientForbidden(req, patientId)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, billingService.findPatientBills(patientId), 200);
}

function findAllReceipts(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, scopeToOrg(billingService.findAllReceipts(), req), 200);
}

function findReceiptsByPatient(req, res) {
  const patientId = +req.params.patientId;
  if (targetPatientForbidden(req, patientId)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, billingService.findReceiptsByPatient(patientId), 200);
}

function findDischargeSummary(req, res) {
  const result = billingService.findDischargeSummaryByAdmission(
    +req.params.admissionId,
  );
  if (
    result &&
    (forbidsOtherPatient(req, result.patient_id) || !belongsToOrg(result, req))
  ) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, result, 200);
}

function findAllLeaders(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, scopeToOrg(billingService.findAllLeaders(), req), 200);
}

function createLeader(req, res) {
  try {
    const result = billingService.createLeader(withTenant(req, req.body));
    logger.log(
      `⭐ LEADER CREATED  id=${result.leader_id}  admission_id=${result.admission_id}  service_id=${result.service_id}`,
    );
    sendSuccess(res, result, 201);
  } catch (err) {
    sendError(res, err, err.statusCode || 400);
  }
}

function approveLeader(req, res) {
  const leaderId = +req.params.id;
  const existing = billingService.findLeaderById(leaderId);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  const result = billingService.approveLeader(leaderId);
  if (result.error === 'NOT_FOUND') {
    return sendError(res, new NotFoundError(result.message), 404);
  }
  if (result.error === 'ALREADY_APPROVED') {
    return sendError(res, new ValidationError(result.message), 400);
  }
  logger.log(`⭐ LEADER APPROVED  id=${result.leader.leader_id}  ledger_id=${result.ledger.ledger_id}`);
  sendSuccess(res, result, 200);
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
  findAllLeaders,
  createLeader,
  approveLeader,
};
