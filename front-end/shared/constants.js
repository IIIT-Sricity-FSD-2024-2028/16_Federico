/**
 * shared/constants.js
 * Single source of truth for all enums, status strings, and config
 * constants used across HOM, FA, PRE, and Patient modules.
 * Loaded before canonical-seed.js in every HTML file.
 */
(function () {
  window.HospitalConstants = {

    // ── Versioning ──────────────────────────────────────────────────
    STATE_VERSION: "2.0.0",

    // ── Departments ─────────────────────────────────────────────────
    // Canonical list used by PRE dropdowns, HOM filters, FA views.
    DEPARTMENTS: [
      "ICU",
      "General Medicine",
      "Surgery",
      "Pediatrics",
      "Emergency",
      "Maternity",
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Pulmonology",
      "Dermatology"
    ],

    // ── Ward Types ───────────────────────────────────────────────────
    WARD_TYPES: [
      "ICU Ward",
      "General Ward",
      "Surgical Ward",
      "Pediatric Ward",
      "Emergency Ward",
      "Maternity Ward"
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
