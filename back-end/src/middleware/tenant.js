'use strict';


const dataStore = require('../store/dataStore');


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
