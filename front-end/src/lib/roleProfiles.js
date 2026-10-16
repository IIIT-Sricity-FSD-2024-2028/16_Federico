'use strict';

/**
 * Actor profiles and demo credentials, lifted from shared/rbac.js.
 *
 * `FA.accessRole` is the legacy label "ADMIN" and is deliberately distinct from
 * the Admin actor's "ORG_ADMIN", so the two can never collide in an
 * authorize(['ADMIN', ...]) check. Do not "harmonise" these strings.
 */
export const actorProfiles = {
  Admin: {
    actor: 'Admin',
    accessRole: 'ORG_ADMIN',
    label: 'Admin',
    modules: [
      'ADMIN',
      'ANALYTICS',
      'ADMISSIONS',
      'INVENTORY',
      'DOCTOR',
      'PATIENT',
      'BILLING',
      'APPOINTMENTS',
      'INSURANCE',
      'LEADERSHIP',
    ],
  },
  Patient: { actor: 'Patient', accessRole: 'PATIENT', label: 'Patient', modules: ['PATIENT'] },
  PRE: { actor: 'PRE', accessRole: 'OPERATIONS', label: 'PRE Operator', modules: ['PRE'] },
  HOM: {
    actor: 'HOM',
    accessRole: 'SUPER_USER',
    label: 'Super User',
    modules: ['HOM', 'FA', 'PRE', 'PATIENT'],
  },
  FA: { actor: 'FA', accessRole: 'ADMIN', label: 'Admin', modules: ['FA'] },
};

/**
 * Fallback demo credentials (dynamic credentials are now provided by
 * GET /auth/demo-accounts from the backend).
 */
export const mockAccountsByOrg = {};

export const PLATFORM_DEMO_ACCOUNT = {
  email: 'super.platform@federico.com',
  password: 'Federico@Platform123',
  displayName: 'Platform Super User',
};

export function getProfile(actor) {
  return actorProfiles[actor] || null;
}

/** Actor -> portal access check (RBAC), distinct from org module entitlement. */
export function hasModuleAccess(moduleName, actor) {
  const profile = getProfile(actor);
  return Boolean(profile && profile.modules.includes(moduleName));
}

