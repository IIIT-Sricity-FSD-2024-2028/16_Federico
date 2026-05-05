// shared/finance-states.js
// Single source of truth for all payment/ledger/dispatch status strings.
// Referenced by FA/js/app.js, HOM/storage.js, and Patient/patient-billing.js.

window.FinanceStates = (function () {
  const STATES = {
    // Ledger & service request statuses
    DRAFT:                "DRAFT",
    PENDING:              "PENDING",
    PENDING_VERIFICATION: "PENDING_VERIFICATION",
    PENDING_RECEIPT:      "PENDING_RECEIPT",
    PAID:                 "PAID",
    CONFIRMED:            "CONFIRMED",
    REJECTED:             "REJECTED",
    COMPLETED:            "COMPLETED",

    // Dispatch queue statuses
    QUEUED: "QUEUED",
    SENT:   "SENT",

    // Helpers
    isTerminal: function (status) {
      return status === this.PAID || status === this.CONFIRMED || status === this.COMPLETED;
    },
    isPending: function (status) {
      return (
        status === this.PENDING ||
        status === this.PENDING_VERIFICATION ||
        status === this.PENDING_RECEIPT
      );
    }
  };

  return STATES;
})();
