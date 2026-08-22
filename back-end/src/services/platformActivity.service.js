'use strict';

const dataStore = require('../store/dataStore');

/**
 * Platform-wide audit trail — distinct from `activityService` (org-scoped
 * business events like admissions/payments). This logs Platform Super
 * User actions themselves (create/suspend/activate/delete an org, change
 * its plan, toggle a module) — the "Monitor Platform Usage" responsibility
 * from tasks.md §3. Mirrors `activity.service.js`'s exact shape/pattern.
 */
function log(platformUserId, action, targetOrganizationId, details) {
  const entry = {
    id:
      dataStore.platformActivityLog.length > 0
        ? Math.max(...dataStore.platformActivityLog.map((a) => a.id)) + 1
        : 1,
    platform_user_id: platformUserId || null,
    action,
    target_organization_id: targetOrganizationId || null,
    details: details || null,
    created_at: new Date().toISOString(),
  };
  dataStore.platformActivityLog.unshift(entry);
  return entry;
}

function findAll() {
  return dataStore.platformActivityLog;
}

module.exports = { log, findAll };
