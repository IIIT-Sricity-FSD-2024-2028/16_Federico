'use strict';

const { Router } = require('express');
const controller = require('../controllers/billing.controller');
const { authorize } = require('../middleware/actorAccess');
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
router.get('/services', authorize(['ADMIN', 'SUPER_USER'], 'billing', 'read'), controller.findAllServices);
router.post(
  '/services',
  authorize(['SUPER_USER'], 'billing', 'write'),
  validateBody(createServiceRules),
  controller.createService,
);

// Ledger
router.get('/ledger/:admissionId', authorize(['ADMIN', 'SUPER_USER'], 'billing', 'read'), controller.findLedgerByAdmission);
router.post('/ledger', authorize(['SUPER_USER'], 'billing', 'write'), validateBody(createLedgerRules), controller.createLedger);

// Ledger entries
router.get(
  '/ledger/:ledgerId/entries',
  authorize(['ADMIN', 'SUPER_USER'], 'billing', 'read'),
  controller.findLedgerEntries,
);
router.post(
  '/ledger/entry',
  authorize(['SUPER_USER'], 'billing', 'write'),
  validateBody(createLedgerEntryRules),
  controller.addLedgerEntry,
);

// Phase 2 — dispatch a ledger to the patient
router.put('/ledger/:id/dispatch', authorize(['SUPER_USER'], 'billing', 'write'), controller.dispatchLedger);

// Payments
router.get('/payments', authorize(['ADMIN', 'SUPER_USER'], 'billing', 'read'), controller.findAllPayments);
router.post(
  '/payments',
  authorize(['SUPER_USER'], 'payment', 'write'),
  validateBody(createPaymentRules),
  controller.createPayment,
);

// Discharge summary
router.post(
  '/discharge-summary',
  authorize(['SUPER_USER'], 'billing', 'write'),
  validateBody(createDischargeSummaryRules),
  controller.createSummary,
);
router.get(
  '/discharge-summary/:admissionId',
  authorize(['ADMIN', 'SUPER_USER'], 'billing', 'read'),
  controller.findDischargeSummary,
);

// Phase 2 — patient-facing bill/receipt views
router.get(
  '/patient/:patientId/bills',
  authorize(['ADMIN', 'SUPER_USER'], 'billing', 'read'),
  controller.findPatientBills,
);
router.get('/receipts', authorize(['ADMIN', 'SUPER_USER'], 'billing', 'read'), controller.findAllReceipts);
router.get(
  '/patient/:patientId/receipts',
  authorize(['ADMIN', 'SUPER_USER'], 'billing', 'read'),
  controller.findReceiptsByPatient,
);

module.exports = router;
