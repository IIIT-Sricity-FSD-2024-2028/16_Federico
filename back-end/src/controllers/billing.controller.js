'use strict';

const billingService = require('../services/billing.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('💰 Billing');

function findAllServices(req, res) {
  sendResult(res, billingService.findAllServices(), 200);
}

function createService(req, res) {
  sendResult(res, billingService.createService(req.body), 201);
}

function findLedgerByAdmission(req, res) {
  sendResult(res, billingService.findLedgerByAdmission(+req.params.admissionId), 200);
}

function createLedger(req, res) {
  const result = billingService.createLedger(req.body);
  logger.log(`📔 LEDGER CREATED  id=${result.ledger_id}  admission_id=${result.admission_id}`);
  sendResult(res, result, 201);
}

function findLedgerEntries(req, res) {
  sendResult(res, billingService.findLedgerEntries(+req.params.ledgerId), 200);
}

function addLedgerEntry(req, res) {
  const result = billingService.addLedgerEntry(req.body);
  logger.log(`➕ LEDGER ENTRY ADDED  ledger_id=${result.ledger_id}  service_id=${result.service_id}  amount=${result.amount}`);
  sendResult(res, result, 201);
}

function findAllPayments(req, res) {
  sendResult(res, billingService.findAllPayments(), 200);
}

function createPayment(req, res) {
  const result = billingService.createPayment(req.body);
  logger.log(`💳 PAYMENT CREATED  id=${result.payment_id}  ledger_id=${result.ledger_id}  amount=${result.amount_paid}`);
  sendResult(res, result, 201);
}

function createSummary(req, res) {
  const result = billingService.createDischargeSummary(req.body);
  logger.log(`📄 DISCHARGE SUMMARY CREATED  id=${result.summary_id}  admission_id=${result.admission_id}`);
  sendResult(res, result, 201);
}

module.exports = {
  findAllServices,
  createService,
  findLedgerByAdmission,
  createLedger,
  findLedgerEntries,
  addLedgerEntry,
  findAllPayments,
  createPayment,
  createSummary,
};
