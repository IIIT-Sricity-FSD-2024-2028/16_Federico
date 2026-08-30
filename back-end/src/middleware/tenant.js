'use strict';

const dataStore = require('../store/dataStore');

function attachTenant(req, res, next) {
  if (req.session) {
    req.tenant = {
      organizationId: req.session.organizationId ? Number(req.session.organizationId) : null,
      hospitalId: req.session.hospitalId ? Number(req.session.hospitalId) : null,
      isPlatformUser: Boolean(req.session.isPlatformUser),
    };
  } else {
    // For unauthenticated or public/marketplace requests, support optional header or default to null
    const headerOrg = req.headers['x-organization-id'];
    req.tenant = {
      organizationId: headerOrg ? Number(headerOrg) : null,
      hospitalId: null,
      isPlatformUser: false,
    };
  }
  next();
}

function requireTenant(req, res, next) {
  if (!req.tenant || !req.tenant.organizationId) {
    return res.status(403).json({
      message: 'This resource requires an active organization context',
      error: 'Forbidden',
      statusCode: 403,
    });
  }
  next();
}

/**
 * Central module-entitlement gate. An organization may only reach a
 * feature router if it has PURCHASED/ENABLED that module — independent of
 * RBAC. RBAC (middleware/actorAccess.js#authorize) still runs afterwards
 * and decides whether the caller's ROLE may act within the module.
 *
 *   authenticated -> tenant -> [requireModule] -> [authorize] -> ALLOW
 *
 * Fail CLOSED: a missing organizationModules row (module never provisioned
 * for this org) is treated exactly like an explicit `enabled: false`, so a
 * module the org didn't buy is never reachable just because no one wrote a
 * flag row for it. Platform Super Users and unauthenticated/public
 * requests (no organizationId) are not module-gated here.
 */
function requireModule(moduleCode) {
  return function (req, res, next) {
    // No tenant context → not an org-scoped request (platform user, public
    // marketplace, Swagger probe). Module gating does not apply.
    if (!req.tenant || !req.tenant.organizationId) return next();
    if (req.tenant.isPlatformUser) return next();

    const code = String(moduleCode).toUpperCase();
    const flag = dataStore.organizationModules.find(
      (m) => m.organization_id === req.tenant.organizationId && m.module_code === code,
    );

    const enabled = Boolean(flag && flag.enabled === true);
    if (!enabled) {
      return res.status(403).json({
        message: `The ${code} module is not enabled for your organization`,
        error: 'Forbidden',
        statusCode: 403,
      });
    }
    next();
  };
}

module.exports = { attachTenant, requireTenant, requireModule };
