/**
 * sanitizer.js — Phase 3
 * Role-based field sanitizer for cross-role data display.
 * Exposes window.Sanitizer globally.
 *
 * Usage: const safeObj = window.Sanitizer.forRole(dataObject, 'PATIENT');
 *
 * Rules:
 *   PATIENT: strips all internal finance/insurance/billing fields.
 *   HOM:     strips billing links and full insurance sub-objects.
 *   FA, PRE: data returned unchanged.
 *
 * IMPORTANT: returns a shallow CLONE — never mutates the input.
 */
(function () {
  var PATIENT_FIELDS = [
    "ledger_id",
    "internal_id",
    "billing_link",
    "payment_link",
    "discharge_summary_link",
    "receipt_link",
    "link",
    "insurance",
    "policyNumber",
    "memberId",
    "validFrom",
    "validTo",
    "coverageType",
    "payment_mode",
    "payment_confirmed",
    "dispatchQueue",
    "faLedgerRequests",
    "serviceRequests",
    "billingRecords",
  ];

  var HOM_FIELDS = [
    "billing_link",
    "payment_link",
    "discharge_summary_link",
    "receipt_link",
    "insurance",
    "policyNumber",
    "memberId",
    "validFrom",
    "validTo",
    "coverageType",
    "faLedgerRequests",
    "billingRecords",
  ];

  window.Sanitizer = {
    /**
     * Returns a sanitized shallow clone of `data` for the given role.
     *
     * @param {object} data - Any plain object (admission, ledger row, dispatch item, etc.)
     * @param {string} role - One of "HOM", "FA", "PRE", "PATIENT"
     * @returns {object} Shallow clone with sensitive fields removed.
     */
    forRole: function (data, role) {
      if (!data || typeof data !== "object") return data;

      var clone = Object.assign({}, data);

      var fieldsToRemove;
      if (role === "PATIENT") {
        fieldsToRemove = PATIENT_FIELDS;
      } else if (role === "HOM") {
        fieldsToRemove = HOM_FIELDS;
      } else {
        // FA and PRE: return unchanged clone (no removals)
        return clone;
      }

      for (var i = 0; i < fieldsToRemove.length; i++) {
        delete clone[fieldsToRemove[i]];
      }

      return clone;
    },
  };
})();
