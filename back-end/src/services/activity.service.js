'use strict';

const dataStore = require('../store/dataStore');

/**
 * Lightweight audit trail for workflow transitions (login, pre-request
 * status changes, bed allocation, billing dispatch/payment, discharge).
 * New in Phase 2 — not a port of anything, since the original NestJS app
 * had no equivalent beyond raw console request logging.
 */
function log(type, text, meta, organizationId) {
  const entry = {
    id:
      dataStore.activityLog.length > 0
        ? Math.max(...dataStore.activityLog.map((a) => a.id)) + 1
        : 1,
    type, // 'info' | 'success' | 'warning' | 'error'
    text,
    meta: meta || null,
    organization_id: organizationId || null,
    created_at: new Date().toISOString(),
  };
  dataStore.activityLog.unshift(entry);
  return entry;
}

function findAll() {
  return dataStore.activityLog;
}

module.exports = { log, findAll };
