'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');

/**
 * Lightweight audit trail for workflow transitions (login, pre-request
 * status changes, bed allocation, billing dispatch/payment, discharge).
 * New in Phase 2 — not a port of anything, since the original NestJS app
 * had no equivalent beyond raw console request logging.
 */
function log(type, text, meta, organizationId) {
  const hospitalId = (meta && meta.hospital_id) ? Number(meta.hospital_id) : (meta && meta.hospitalId) ? Number(meta.hospitalId) : null;
  const entry = {
    id: maxId(dataStore.activityLog, 'id', 1) + 1,
    type: type || 'info', // 'info' | 'success' | 'warning' | 'error'
    text: text || '',
    meta: meta || null,
    organization_id: organizationId ? Number(organizationId) : null,
    hospital_id: hospitalId,
    created_at: new Date().toISOString(),
  };
  dataStore.activityLog.unshift(entry);
  return entry;
}

function findAll() {
  return dataStore.activityLog;
}

module.exports = { log, findAll };
