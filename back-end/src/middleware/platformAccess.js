'use strict';


function requirePlatformUser(req, res, next) {
  if (!req.session || !req.session.isPlatformUser) {
    return res.status(403).json({
      message: 'Forbidden resource',
      error: 'Forbidden',
      statusCode: 403,
    });
  }
  next();
}

module.exports = { requirePlatformUser };
