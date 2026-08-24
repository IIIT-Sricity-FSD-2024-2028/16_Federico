'use strict';

const { ForbiddenError } = require('../errors');
const { sendError } = require('../utils/response');

function requirePlatformUser(req, res, next) {
  if (!req.session || !req.session.isPlatformUser) {
    return sendError(
      res,
      new ForbiddenError('Forbidden: Requires platform super-user privileges'),
      403,
    );
  }
  next();
}

module.exports = { requirePlatformUser };
