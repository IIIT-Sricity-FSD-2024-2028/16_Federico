/**
 * ledger-validator.js — Phase 3
 * Validates that a ledger exists for a given admission before FA actions proceed.
 * Exposes window.LedgerValidator globally.
 *
 * Usage: window.LedgerValidator.existsForAdmission(admissionId, state)
 *
 * IMPORTANT: does NOT read from localStorage. Uses the state object passed in.
 */
(function () {
  window.LedgerValidator = {
    /**
     * Returns true if any ledger in state.ledgers is associated with admissionId.
     * Checks both ledger.admission_id and ledger.admissionId (camelCase) for compatibility.
     *
     * @param {string|number} admissionId
     * @param {object} state - Full app state (e.g. from Store.get() or AppState)
     * @returns {boolean}
     */
    existsForAdmission: function (admissionId, state) {
      if (admissionId === undefined || admissionId === null) return false;
      if (!state || typeof state !== "object") return false;

      var ledgers = state.ledgers;
      if (!ledgers || typeof ledgers !== "object") return false;

      var normalizedId = String(admissionId);
      var values = Object.values(ledgers);

      for (var i = 0; i < values.length; i++) {
        var ledger = values[i];
        if (!ledger || typeof ledger !== "object") continue;

        // An array ledger (keyed by admissionId directly) — the key IS the admissionId
        // But we also check explicit admission_id / admissionId fields on ledger objects
        if (
          String(ledger.admission_id) === normalizedId ||
          String(ledger.admissionId) === normalizedId
        ) {
          return true;
        }
      }

      // Also check if state.ledgers has a key that directly IS the admissionId
      // (FA stores ledgers as { [ledger_id]: [] } so the key is ledger_id, not admissionId).
      // For FA's pattern: admission.ledger_id points to the ledger key, so we check
      // if any admission in state.admissions whose admission_id matches has a ledger_id
      // that exists in state.ledgers.
      var admissions = state.admissions;
      if (admissions && typeof admissions === "object") {
        var admissionValues = Object.values(admissions);
        for (var j = 0; j < admissionValues.length; j++) {
          var adm = admissionValues[j];
          if (!adm) continue;
          var admId = String(adm.admission_id);
          if (admId === normalizedId) {
            // Found the admission — now check if its ledger_id key exists in ledgers
            if (adm.ledger_id !== undefined && adm.ledger_id !== null) {
              var ledgerKey = String(adm.ledger_id);
              if (Object.prototype.hasOwnProperty.call(ledgers, ledgerKey)) {
                return true;
              }
            }
            return false;
          }
        }
      }

      return false;
    },
  };
})();
