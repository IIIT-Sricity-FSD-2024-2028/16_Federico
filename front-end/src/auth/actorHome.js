'use strict';

/**
 * Where each actor's portal lives, ported from shared/rbac.js#getActorHome.
 *
 * The legacy version juggled relative "../" prefixes because PRE's pages sit one
 * directory deeper than every other portal. Route paths are absolute, so all of
 * that disappears - the destinations themselves are unchanged (DEC-1).
 */
export const ACTOR_HOME = {
  HOM: '/HOM/screen-01-dashboard.html',
  Admin: '/Admin/screen-01-dashboard.html',
  FA: '/FA/fa-dashboard.html',
  PRE: '/PRE/pages/PRE.html',
  Patient: '/Patient/patient-dashboard.html',
  PLATFORM: '/platform/platform-dashboard.html',
};

export const LOGIN_PATH = '/login/login-page.html';

export function getActorHome(actor) {
  return ACTOR_HOME[actor] || LOGIN_PATH;
}

