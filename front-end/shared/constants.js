/**
 * shared/constants.js
 * Single source of truth for all enums, status strings, and config
 * constants used across HOM, FA, PRE, and Patient modules.
 */
(function () {
  window.HospitalConstants = {

    // ── Versioning ──────────────────────────────────────────────────
    STATE_VERSION: "2.0.0",

    // ── Default Departments / Wards ────────────────────────────────────
    // The standard 6 department-ward pairs every hospital starts with
    // (back-end/src/services/provisioning.service.js seeds exactly this
    // list for a new organization; back-end/src/config/
    // defaultClinicalCatalog.js is the backend's copy of the same data —
    // keep both in sync). This replaces what used to be two separate,
    // disconnected flat arrays (DEPARTMENTS / WARD_TYPES) that nothing in
    // the frontend actually read, alongside a THIRD, independent regex
    // guesser in PRE/js/shared-state.js that didn't agree with either.
    // Admin can add/remove departments per hospital beyond this baseline
    // (see front-end/Admin/screen-02-departments.html) — this is only the
    // default starting point.
    DEFAULT_DEPARTMENTS: [
      { department: "Critical Care", wardName: "ICU", defaultBeds: 8 },
      { department: "General Medicine", wardName: "General Ward", defaultBeds: 20 },
      { department: "Surgery", wardName: "Surgical Ward", defaultBeds: 12 },
      { department: "Pediatrics", wardName: "Pediatric Ward", defaultBeds: 10 },
      { department: "Emergency", wardName: "Emergency Ward", defaultBeds: 8 },
      { department: "Obstetrics", wardName: "Maternity Ward", defaultBeds: 10 }
    ],

    // ── Bed Statuses ─────────────────────────────────────────────────
    BED_STATUS: {
      OCCUPIED:    "occupied",
      AVAILABLE:   "available",
      MAINTENANCE: "maintenance"   // replaces legacy "reserved"
    },

    // ── PRE Request Statuses ─────────────────────────────────────────
    PRE_STATUS: {
      PENDING:   "Pending",
      APPROVED:  "Approved",
      REJECTED:  "Rejected",
      ADMITTED:  "Admitted",
      DISCHARGE: "Discharge",
      EMERGENCY: "Emergency"
    },

    // ── Admission / Billing Statuses ─────────────────────────────────
    ADMISSION_STATUS: {
      ACTIVE:            "Active",
      DISCHARGE_PENDING: "Discharge Pending"
    },

    // ── Payment / Ledger Statuses ────────────────────────────────────
    PAYMENT_STATUS: {
      UNPAID:               "UNPAID",
      PENDING_VERIFICATION: "PENDING_VERIFICATION",
      PAID:                 "PAID"
    },

    // ── Service Request Statuses ─────────────────────────────────────
    SERVICE_STATUS: {
      PENDING:  "PENDING",
      APPROVED: "APPROVED",
      REJECTED: "REJECTED"
    },

    // ── Ledger Request Statuses ──────────────────────────────────────
    LEDGER_REQUEST_STATUS: {
      PENDING:  "PENDING",
      ACTIVE:   "ACTIVE",
      CLOSED:   "CLOSED"
    }
  };
})();
