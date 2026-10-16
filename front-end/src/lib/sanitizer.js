'use strict';

/**
 * Role-based field stripper, ported from shared/sanitizer.js. Returns a
 * sanitized shallow clone; never mutates the input.
 */
const PATIENT_FIELDS = [
  'ledger_id',
  'internal_id',
  'billing_link',
  'payment_link',
  'discharge_summary_link',
  'receipt_link',
  'link',
  'insurance',
  'policyNumber',
  'memberId',
  'validFrom',
  'validTo',
  'coverageType',
  'payment_mode',
  'payment_confirmed',
  'dispatchQueue',
  'faLedgerRequests',
  'serviceRequests',
  'billingRecords',
];

const HOM_FIELDS = [
  'billing_link',
  'payment_link',
  'discharge_summary_link',
  'receipt_link',
  'insurance',
  'policyNumber',
  'memberId',
  'validFrom',
  'validTo',
  'coverageType',
  'faLedgerRequests',
  'billingRecords',
];

export function forRole(data, role) {
  if (!data || typeof data !== 'object') return data;

  const clone = { ...data };
  let fieldsToRemove;

  if (role === 'PATIENT') fieldsToRemove = PATIENT_FIELDS;
  else if (role === 'HOM') fieldsToRemove = HOM_FIELDS;
  else return clone;

  for (let i = 0; i < fieldsToRemove.length; i++) {
    delete clone[fieldsToRemove[i]];
  }

  return clone;
}

