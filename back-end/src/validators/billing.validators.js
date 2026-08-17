'use strict';

// Port of billing/dto/billing.dto.ts (the DTOs actually wired to BillingController)

const createServiceRules = [
  { field: 'service_name', checks: ['isNotEmpty', 'isString'] },
  { field: 'base_cost', checks: ['isNumber'] },
];

const createLedgerRules = [
  { field: 'admission_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'status', checks: ['isNotEmpty', 'isString'] },
];

const createLedgerEntryRules = [
  { field: 'ledger_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'service_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'quantity', checks: ['isNotEmpty', 'isInt'] },
  { field: 'unit_price', checks: ['isNumber'] },
  { field: 'amount', checks: ['isNumber'] },
];

const createPaymentRules = [
  { field: 'ledger_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'amount_paid', checks: ['isNumber'] },
  { field: 'payment_mode', checks: ['isNotEmpty', 'isString'] },
];

const createDischargeSummaryRules = [
  { field: 'admission_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'patient_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'discharge_notes', checks: ['isNotEmpty', 'isString'] },
  { field: 'final_amount', checks: ['isNumber'] },
  { field: 'file_path', checks: ['isString'], optional: true },
];

module.exports = {
  createServiceRules,
  createLedgerRules,
  createLedgerEntryRules,
  createPaymentRules,
  createDischargeSummaryRules,
};
