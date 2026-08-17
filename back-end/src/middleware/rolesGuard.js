'use strict';

/**
 * Direct port of NestJS's RolesGuard + @Roles() decorator, collapsed into
 * one per-route middleware factory. Nest's guard returns false when the
 * `x-role` header isn't in the allowed list, and Nest auto-throws a
 * ForbiddenException (403, "Forbidden resource") whenever a guard returns
 * false — replicated exactly here, including the case of no header at all.
 */
function requireRoles(...allowedRoles) {
  return function rolesGuard(req, res, next) {
    const userRole = req.headers['x-role'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: 'Forbidden resource',
        error: 'Forbidden',
        statusCode: 403,
      });
    }
    next();
  };
}

module.exports = { requireRoles };
