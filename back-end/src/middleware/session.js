'use strict';

const { getSession } = require('../store/sessionStore');

/**
 * Non-blocking: parses `Authorization: Bearer <token>` if present and
 * attaches `req.session` (or leaves it undefined). Never rejects a
 * request by itself — combined with `authorize()` (actorAccess.js) or
 * `requireSession()` below to actually gate a route.
 */
function attachSession(req, res, next) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    const session = getSession(token);
    if (session) req.session = session;
  }
  next();
}

function requireSession(req, res, next) {
  if (!req.session) {
    return res.status(401).json({
      message: 'Authentication required',
      error: 'Unauthorized',
      statusCode: 401,
    });
  }
  next();
}

function requireActor(...actors) {
  return function (req, res, next) {
    if (!req.session || !actors.includes(req.session.role)) {
      return res.status(403).json({
        message: 'Forbidden resource',
        error: 'Forbidden',
        statusCode: 403,
      });
    }
    next();
  };
}

module.exports = { attachSession, requireSession, requireActor };
