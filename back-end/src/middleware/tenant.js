'use strict';

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
 * Legacy module-entitlement gate. All modules are now unlocked by default
 * in the capacity and resource-based model. Pass-through for compatibility.
 */
function requireModule() {
  return function (_req, _res, next) {
    next();
  };
}

module.exports = { attachTenant, requireTenant, requireModule };
