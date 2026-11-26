'use strict';

/**
 * Where each actor's portal lives.
 */
export const ACTOR_HOME = {
  HOM: '/hom/dashboard',
  Admin: '/admin/dashboard',
  FA: '/fa',
  PRE: '/pre/dashboard',
  Patient: '/patient/dashboard',
  PLATFORM: '/platform',
};

export const LOGIN_PATH = '/login';

export function getActorHome(actor) {
  return ACTOR_HOME[actor] || LOGIN_PATH;
}

