'use strict';

const { Router } = require('express');
const controller = require('../controllers/billing.controller');
const { requireRoles } = require('../middleware/rolesGuard');
const { validateBody } = require('../validators/engine');
const {
  createServiceRules,
  createLedgerRules,
  createLedgerEntryRules,
  createPaymentRules,
  createDischargeSummaryRules,
} = require('../validators/billing.validators');

const router = Router();

// Services
router.get('/services', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllServices);
router.post('/services', requireRoles('SUPER_USER'), validateBody(createServiceRules), controller.createService);

// Ledger
router.get('/ledger/:admissionId', requireRoles('ADMIN', 'SUPER_USER'), controller.findLedgerByAdmission);
router.post('/ledger', requireRoles('SUPER_USER'), validateBody(createLedgerRules), controller.createLedger);

// Ledger entries
router.get('/ledger/:ledgerId/entries', requireRoles('ADMIN', 'SUPER_USER'), controller.findLedgerEntries);
router.post(
  '/ledger/entry',
  requireRoles('SUPER_USER'),
  validateBody(createLedgerEntryRules),
  controller.addLedgerEntry,
);

// Payments
router.get('/payments', requireRoles('ADMIN', 'SUPER_USER'), controller.findAllPayments);
router.post('/payments', requireRoles('SUPER_USER'), validateBody(createPaymentRules), controller.createPayment);

// Discharge summary
router.post(
  '/discharge-summary',
  requireRoles('SUPER_USER'),
  validateBody(createDischargeSummaryRules),
  controller.createSummary,
);

module.exports = router;
