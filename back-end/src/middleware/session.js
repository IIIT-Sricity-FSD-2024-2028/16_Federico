'use strict';

const { getSession } = require('../store/sessionStore');
const { UnauthorizedError, ForbiddenError } = require('../errors');
const { sendError } = require('../utils/response');

/**
 * Extracts session token from Authorization Bearer header or cookie.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
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

/**
 * Attaches authenticated session to req.session if valid token is provided.
 */
function attachSession(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const session = getSession(token);
    if (session) {
      req.session = session;
      req.token = token;
    }
  }
  next();
}

/**
 * Enforces authenticated session. Returns 401 if missing.
 */
function requireSession(req, res, next) {
  if (!req.session) {
    return sendError(res, new UnauthorizedError('Authentication required'), 401);
  }
  next();
}

/**
 * Enforces that current user possesses at least one of the required actor roles.
 * @param  {...string} actors - Allowed actor role names (e.g. 'HOM', 'FA', 'PRE', 'Admin', 'Patient')
 */
function requireActor(...actors) {
  return function (req, res, next) {
    if (!req.session || !actors.includes(req.session.role)) {
      return sendError(
        res,
        new ForbiddenError(`Access denied: Requires one of [${actors.join(', ')}] role`),
        403,
      );
    }
    next();
  };
}

module.exports = {
  attachSession,
  requireSession,
  requireActor,
  extractToken,
};
