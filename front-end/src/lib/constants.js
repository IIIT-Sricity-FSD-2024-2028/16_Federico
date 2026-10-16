'use strict';

/** Ported from shared/constants.js. Only DEFAULT_DEPARTMENTS has a live reader. */
export const STATE_VERSION = '2.0.0';

export const DEFAULT_DEPARTMENTS = Object.freeze([
  Object.freeze({ department: 'Critical Care', wardName: 'ICU', defaultBeds: 8 }),
  Object.freeze({ department: 'General Medicine', wardName: 'General Ward', defaultBeds: 20 }),
  Object.freeze({ department: 'Surgery', wardName: 'Surgical Ward', defaultBeds: 12 }),
  Object.freeze({ department: 'Pediatrics', wardName: 'Pediatric Ward', defaultBeds: 10 }),
  Object.freeze({ department: 'Emergency', wardName: 'Emergency Ward', defaultBeds: 8 }),
  Object.freeze({ department: 'Obstetrics', wardName: 'Maternity Ward', defaultBeds: 10 }),
]);

export const BED_STATUS = Object.freeze({
  OCCUPIED: 'occupied',
  AVAILABLE: 'available',
  MAINTENANCE: 'maintenance',
});

export const PRE_STATUS = Object.freeze({
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ADMITTED: 'Admitted',
  DISCHARGE: 'Discharge',
  CRITICAL: 'Critical',
});

export const ADMISSION_STATUS = Object.freeze({
  ACTIVE: 'Active',
  DISCHARGE_PENDING: 'Discharge Pending',
});

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: 'UNPAID',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  PAID: 'PAID',
});

export const SERVICE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const LEDGER_REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
});

