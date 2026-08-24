/**
 * shared/sanitizer.js
 * Role-based field sanitizer for cross-role data display.
 * Returns a sanitized shallow clone — never mutates the input.
 */
(function (root, factory) {
  'use strict';
  var exported = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.Sanitizer = exported;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var PATIENT_FIELDS = [
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

  var HOM_FIELDS = [
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

  /**
   * Returns a sanitized shallow clone of `data` for the given role.
   * @param {object} data
   * @param {string} role - One of "HOM", "FA", "PRE", "PATIENT"
   * @returns {object} Shallow clone with sensitive fields removed.
   */
  function forRole(data, role) {
    if (!data || typeof data !== 'object') return data;

    var clone = Object.assign({}, data);
    var fieldsToRemove;

    if (role === 'PATIENT') {
      fieldsToRemove = PATIENT_FIELDS;
    } else if (role === 'HOM') {
      fieldsToRemove = HOM_FIELDS;
    } else {
      return clone;
    }

    for (var i = 0; i < fieldsToRemove.length; i++) {
      delete clone[fieldsToRemove[i]];
    }

    return clone;
  }

  return Object.freeze({
    forRole: forRole,
  });
});
