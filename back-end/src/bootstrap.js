'use strict';

/**
 * One-time boot reconciliation, run AFTER persist.load() restores any saved
 * db.json and BEFORE the HTTP server starts serving. Deliberately not called
 * from createApp() so unit tests that import createApp() keep seeing raw
 * seed data.
 *
 *  - ensurePermissionCatalog(): the fixed resource:mode permission rows the
 *    dynamic-RBAC layer needs (idempotent).
 *  - backfillDoctorIds(): fills doctor_id on appointments restored from an
 *    older db.json that only recorded the availability slot.
 *  - backfillEmailDomains(): gives an org restored from an older db.json the
 *    email_domain the unified login page maps staff emails onto.
 */

const rbacService = require('./services/rbac.service');
const organizationService = require('./services/organization.service');
const appointmentService = require('./services/appointment.service');
const persist = require('./store/persist');

function runBootReconciliation() {
  try {
    rbacService.ensurePermissionCatalog();
  } catch (err) {
    console.warn(`[Bootstrap] ensurePermissionCatalog failed: ${err.message}`);
  }
  try {
    organizationService.backfillEmailDomains();
  } catch (err) {
    console.warn(`[Bootstrap] backfillEmailDomains failed: ${err.message}`);
  }
  try {
    appointmentService.backfillDoctorIds();
  } catch (err) {
    console.warn(`[Bootstrap] backfillDoctorIds failed: ${err.message}`);
  }

  // Durably flush boot reconciliation mutations to disk
  try {
    persist.markDirty();
    persist.saveImmediate();
  } catch (err) {
    console.warn(`[Bootstrap] Failed to persist boot reconciliation state: ${err.message}`);
  }
}

module.exports = { runBootReconciliation };
