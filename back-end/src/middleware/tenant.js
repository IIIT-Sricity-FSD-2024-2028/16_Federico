'use strict';

/**
 * Tenant resolution — mirrors `session.js`'s "attach, never reject by
 * itself" shape exactly (`attachTenant` is the `attachSession` analogue,
 * `requireTenant`/`requireModule` are the `requireSession`/`requireActor`
 * analogues). Organization/hospital are resolved once at login and carried
 * on the session (`sessionStore.createSession`) — this middleware just
 * projects them onto `req.tenant` for controller convenience.
 */
const dataStore = require('../store/dataStore');

// Org 1 ("Federico General Hospital" — see the dataStore.js seed migration
// notes) is where every pre-multi-tenancy record already lives. A caller
// with no real session at all is, by construction, a legacy `x-role`-only
// caller (test-all-endpoints.ps1, Swagger "try it out") — the Phase 1
// contract those predate multi-tenancy entirely and must keep seeing
// exactly what they always saw. Defaulting the tenant to org 1 for the
// no-session case (rather than null) is what keeps every existing
// scopeToOrg()-filtered list endpoint returning the same data to those
// callers instead of silently going empty. A session-bearing caller
// (real actor or Platform Super User) always overrides this with their
// actual session tenant below.
const LEGACY_DEFAULT_ORGANIZATION_ID = 1;

function attachTenant(req, res, next) {
  if (req.session) {
    req.tenant = {
      organizationId: req.session.organizationId || null,
      hospitalId: req.session.hospitalId || null,
      isPlatformUser: Boolean(req.session.isPlatformUser),
    };
  } else {
    req.tenant = {
      organizationId: LEGACY_DEFAULT_ORGANIZATION_ID,
      hospitalId: null,
      isPlatformUser: false,
    };
  }
  next();
}

/** Rejects Platform Super User sessions (and any session with no org) from org-scoped routes. */
function requireTenant(req, res, next) {
  if (!req.tenant || !req.tenant.organizationId) {
    return res.status(403).json({
      message: 'This resource requires an organization context',
      error: 'Forbidden',
      statusCode: 403,
    });
  }
  next();
}

/**
 * Feature-flag gate. Route-level opt-in (like `authorize`), applied per
 * resource router via `router.use(requireModule(...))`. Legacy
 * x-role-only callers default to org 1 (see `attachTenant` above), whose
 * seed data enables every module — so the Phase 1 legacy contract is
 * preserved by seeding, not by bypassing this check.
 */
function requireModule(moduleCode) {
  return function (req, res, next) {
    if (!req.tenant || !req.tenant.organizationId) return next();
    const flag = dataStore.organizationModules.find(
      (m) =>
        m.organization_id === req.tenant.organizationId &&
        m.module_code === moduleCode,
    );
    if (flag && flag.enabled === false) {
      return res.status(403).json({
        message: `The ${moduleCode} module is not enabled for your organization`,
        error: 'Forbidden',
        statusCode: 403,
      });
    }
    next();
  };
}

module.exports = { attachTenant, requireTenant, requireModule };
