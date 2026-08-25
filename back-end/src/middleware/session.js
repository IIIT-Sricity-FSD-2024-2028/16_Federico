'use strict';

const { getSession } = require('../store/sessionStore');

function extractToken(req) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    return token.trim();
  }
  if (req.cookies && (req.cookies.sessionId || req.cookies.sid || req.cookies['connect.sid'] || req.cookies.token)) {
    return req.cookies.sessionId || req.cookies.sid || req.cookies['connect.sid'] || req.cookies.token;
  }
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:sessionId|sid|connect\.sid|token)=([^;]+)/);
    if (match) return decodeURIComponent(match[1].trim());
  }
  return null;
}

function attachSession(req, res, next) {
  const token = extractToken(req);
  if (token) {
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
        message: `Access denied: Requires one of [${actors.join(', ')}] role`,
        error: 'Forbidden',
        statusCode: 403,
      });
    }
    next();
  };
}

module.exports = { attachSession, requireSession, requireActor, extractToken };
