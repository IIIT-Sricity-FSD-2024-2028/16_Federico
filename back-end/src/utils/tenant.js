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
const MODULES = [
  { code: 'APPOINTMENTS', name: 'Appointments' },
  { code: 'ADMISSIONS', name: 'Admissions & Bed Management' },
  { code: 'INVENTORY', name: 'Inventory & Procurement' },
  { code: 'BILLING', name: 'Billing' },
  { code: 'INSURANCE', name: 'Insurance' },
  { code: 'ANALYTICS', name: 'Administrative Analytics' },
];
const MODULE_CODES = MODULES.map((m) => m.code);

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
  return (list || []).filter((record) => record.organization_id === organizationId);
}

/** True if a single record belongs to the caller's organization. */
function belongsToOrg(record, req) {
  const organizationId = req.tenant && req.tenant.organizationId;
  return Boolean(record && organizationId && record.organization_id === organizationId);
}

module.exports = { MODULES, MODULE_CODES, withTenant, scopeToOrg, belongsToOrg };
