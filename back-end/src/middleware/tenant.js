'use strict';

const { organizationRepository } = require('../repositories');
const { ForbiddenError } = require('../errors');
const { sendError } = require('../utils/response');

/**
 * Attaches tenant context (organizationId, hospitalId, isPlatformUser) to the request.
 */
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

/**
 * Ensures request contains a valid organization tenant scope.
 */
function requireTenant(req, res, next) {
  if (!req.tenant || !req.tenant.organizationId) {
    return sendError(
      res,
      new ForbiddenError('This resource requires an active organization context'),
      403,
    );
  }
  next();
}

/**
 * Enforces that a specific hospital module (e.g. BILLING, INVENTORY, ANALYTICS) is enabled for the caller's tenant.
 * @param {string} moduleCode
 */
function requireModule(moduleCode) {
  return function (req, res, next) {
    if (!req.tenant || !req.tenant.organizationId) return next();

    const modules = organizationRepository.findModulesByOrg(req.tenant.organizationId);
    const flag = modules.find((m) => m.module_code === moduleCode.toUpperCase());

    if (flag && flag.enabled === false) {
      return sendError(
        res,
        new ForbiddenError(`The ${moduleCode} module is not enabled for your organization`),
        403,
      );
    }
    next();
  };
}

module.exports = {
  attachTenant,
  requireTenant,
  requireModule,
};
