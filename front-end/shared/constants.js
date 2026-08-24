/**
 * shared/constants.js
 * Single source of truth for all enums, status strings, and config
 * constants used across HOM, FA, PRE, and Patient modules.
 */
(function (root, factory) {
  'use strict';
  var exported = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.HospitalConstants = exported;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  return Object.freeze({
    // ── Versioning ──────────────────────────────────────────────────
    STATE_VERSION: '2.0.0',

    // ── Default Departments / Wards ─────────────────────────────────
    DEFAULT_DEPARTMENTS: Object.freeze([
      Object.freeze({ department: 'Critical Care', wardName: 'ICU', defaultBeds: 8 }),
      Object.freeze({ department: 'General Medicine', wardName: 'General Ward', defaultBeds: 20 }),
      Object.freeze({ department: 'Surgery', wardName: 'Surgical Ward', defaultBeds: 12 }),
      Object.freeze({ department: 'Pediatrics', wardName: 'Pediatric Ward', defaultBeds: 10 }),
      Object.freeze({ department: 'Emergency', wardName: 'Emergency Ward', defaultBeds: 8 }),
      Object.freeze({ department: 'Obstetrics', wardName: 'Maternity Ward', defaultBeds: 10 }),
    ]),

    // ── Bed Statuses ────────────────────────────────────────────────
    BED_STATUS: Object.freeze({
      OCCUPIED: 'occupied',
      AVAILABLE: 'available',
      MAINTENANCE: 'maintenance',
    }),

    // ── PRE Request Statuses ────────────────────────────────────────
    PRE_STATUS: Object.freeze({
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      ADMITTED: 'Admitted',
      DISCHARGE: 'Discharge',
      EMERGENCY: 'Emergency',
    }),

    // ── Admission / Billing Statuses ────────────────────────────────
    ADMISSION_STATUS: Object.freeze({
      ACTIVE: 'Active',
      DISCHARGE_PENDING: 'Discharge Pending',
    }),

    // ── Payment / Ledger Statuses ───────────────────────────────────
    PAYMENT_STATUS: Object.freeze({
      UNPAID: 'UNPAID',
      PENDING_VERIFICATION: 'PENDING_VERIFICATION',
      PAID: 'PAID',
    }),

    // ── Service Request Statuses ────────────────────────────────────
    SERVICE_STATUS: Object.freeze({
      PENDING: 'PENDING',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
    }),

    // ── Ledger Request Statuses ─────────────────────────────────────
    LEDGER_REQUEST_STATUS: Object.freeze({
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      CLOSED: 'CLOSED',
    }),
  });
});
