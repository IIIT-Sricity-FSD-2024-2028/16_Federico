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

function requireModule(moduleCode) {
  return function (req, res, next) {
    if (!req.tenant || !req.tenant.organizationId) return next();

    const code = moduleCode.toUpperCase();
    const flag = dataStore.organizationModules.find(
      (m) => m.organization_id === req.tenant.organizationId && m.module_code === code,
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
