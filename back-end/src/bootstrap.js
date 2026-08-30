'use strict';

/**
 * One-time boot reconciliation, run on server startup BEFORE the HTTP server
 * starts serving. Deliberately not called from createApp() so unit tests that
 * import createApp() keep seeing raw seed data.
 *
 *  - ensurePermissionCatalog(): the fixed resource:mode permission rows the
 *    dynamic-RBAC layer needs (idempotent).
 *  - syncOrganizationConfig(): guarantees every org has an explicit
 *    organizationModules row for every module code, so the now fail-closed
 *    requireModule() never 403s an org purely because a newly added module
 *    code has no flag row yet.
 */

const rbacService = require('./services/rbac.service');
const organizationService = require('./services/organization.service');

function runBootReconciliation() {
  try {
    rbacService.ensurePermissionCatalog();
  } catch (err) {
    console.warn(`[Bootstrap] ensurePermissionCatalog failed: ${err.message}`);
  }
  try {
    organizationService.syncOrganizationConfig();
  } catch (err) {
    console.warn(`[Bootstrap] syncOrganizationConfig failed: ${err.message}`);
  }
}

module.exports = { runBootReconciliation };
