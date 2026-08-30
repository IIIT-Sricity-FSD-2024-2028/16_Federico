'use strict';

/**
 * Multi-tenancy helpers — added alongside the Platform Super User /
 * Organization layer. Follows the exact same "ownership check lives in the
 * controller, not the service" convention already established by
 * `patientOwnership.js` (see that file's header comment): services stay
 * tenant-agnostic (same `dataStore.X` arrays, same functions), and every
 * controller applies `scopeToOrg`/`withTenant`/`belongsToOrg` around the
 * existing service calls. This means org-scoping a resource never requires
 * threading a new parameter through a service function — it's a call-site
 * change only, which is what keeps this additive and low-risk against the
 * pre-existing single-tenant test coverage.
 *
 * `req.tenant` is attached by `middleware/tenant.js#attachTenant` from
 * `req.session` (organizationId/hospitalId set at login — see
 * `services/auth.service.js`). A request with no session, or a Platform
 * Super User session (which intentionally has no organization — see
 * tasks.md §3, the Platform Super User owns no hospital business data),
 * has `req.tenant.organizationId === null`.
 */

// Fixed module catalog (tasks.md §10 "Feature Flags" example set, extended
// to cover every module this app actually has a resource for).
//
// A module is a *commercially purchasable* unit. Each maps to one or more
// of the `resource:mode` areas in middleware/actorAccess.js#ACTOR_ACCESS
// (see MODULE_RESOURCE_AREAS below). RBAC still decides which role may act
// within a module; the module flag decides whether the organization bought
// the module at all. Both must pass — see middleware/tenant.js#requireModule.
const MODULES = [
  { code: 'APPOINTMENTS', name: 'Appointments' },
  { code: 'ADMISSIONS', name: 'Admissions & Bed Management' },
  { code: 'INVENTORY', name: 'Inventory & Procurement' },
  { code: 'BILLING', name: 'Billing' },
  { code: 'INSURANCE', name: 'Insurance' },
  { code: 'ANALYTICS', name: 'Administrative Analytics' },
  { code: 'DOCTOR', name: 'Doctor Management' },
  { code: 'PATIENT', name: 'Patient Management' },
  { code: 'LEADERSHIP', name: 'Service Charge Approvals (Leaders)' },
];
const MODULE_CODES = MODULES.map((m) => m.code);

// Which ACTOR_ACCESS `resource` keys sit under each purchasable module.
// Used by documentation / tooling — the actual route gating is one
// requireModule('CODE') per feature router.
const MODULE_RESOURCE_AREAS = {
  APPOINTMENTS: ['appointment'],
  ADMISSIONS: ['ward', 'wardAdmin', 'admission', 'preRequest'],
  INVENTORY: ['inventory', 'inventoryCatalog'],
  BILLING: ['billing', 'payment', 'ledgerEntry'],
  INSURANCE: [],
  ANALYTICS: [],
  DOCTOR: ['doctor'],
  PATIENT: ['patient'],
  LEADERSHIP: ['leader'],
};

// Modules that a *pre-existing* organization (one created before a given
// module code existed) should be granted automatically by the boot-time
// backfill, so adding a new module code never silently 403s orgs that were
// working yesterday. New orgs still only get what they select at signup.
const BACKFILL_GRANT_MODULES = ['DOCTOR', 'PATIENT', 'LEADERSHIP'];

/** Stamps organization_id/hospital_id from the request's tenant context onto a create payload. */
function withTenant(req, payload) {
  const tenant = req.tenant || {};
  return {
    ...payload,
    organization_id: tenant.organizationId ?? null,
    hospital_id: (payload && payload.hospital_id) || tenant.hospitalId || null,
  };
}

/** Filters a list down to the caller's organization. No tenant -> empty list (fail closed, never leak cross-org). */
function scopeToOrg(list, req) {
  const organizationId = req.tenant && req.tenant.organizationId;
  if (!organizationId) return [];
  return (list || []).filter(
    (record) => record.organization_id === organizationId,
  );
}

/** True if a single record belongs to the caller's organization. */
function belongsToOrg(record, req) {
  const organizationId = req.tenant && req.tenant.organizationId;
  return Boolean(
    record && organizationId && record.organization_id === organizationId,
  );
}

module.exports = {
  MODULES,
  MODULE_CODES,
  MODULE_RESOURCE_AREAS,
  BACKFILL_GRANT_MODULES,
  withTenant,
  scopeToOrg,
  belongsToOrg,
};
