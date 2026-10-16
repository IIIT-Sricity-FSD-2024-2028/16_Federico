'use strict';

const authService = require('../services/auth.service');
const entitlementService = require('../services/entitlement.service');
const { createLogger } = require('../utils/logger');
const { ACTOR_SLUG_TO_ROLE } = require('../utils/roles');

const logger = createLogger('🔐 Auth');

const LOGIN_ERROR_RESPONSES = {
  INVALID_CREDENTIALS: [401, 'Invalid email or password', 'Unauthorized'],
  WRONG_ORGANIZATION: [
    401,
    'This account is not registered with the selected organization',
    'Unauthorized',
  ],
  ORGANIZATION_INACTIVE: [
    403,
    'This organization is not currently active',
    'Forbidden',
  ],
  ACCOUNT_INACTIVE: [
    403,
    'This account has been deactivated by your administrator',
    'Forbidden',
  ],
  WRONG_PORTAL: [
    403,
    'This account does not belong to that portal',
    'Forbidden',
  ],
};

const { extractToken } = require('../middleware/session');

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `sessionId=${token}; Path=/; HttpOnly; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
}

function respondToLogin(res, email, result) {
  if (result.requiresOrganizationSelection) {
    logger.log(
      `ℹ️ LOGIN REQUIRES ORG SELECTION  email=${email}  count=${result.organizations.length}`,
    );
    return res.status(200).json(result);
  }
  if (result.error) {
    const [status, message, error] =
      LOGIN_ERROR_RESPONSES[result.error] ||
      LOGIN_ERROR_RESPONSES.INVALID_CREDENTIALS;
    logger.log(`❌ LOGIN FAILED  email=${email}  reason=${result.error}`);
    return res.status(status).json({ message, error, statusCode: status });
  }
  logger.log(
    `✅ LOGIN  role=${result.role}  email=${email}  org=${result.tenant ? result.tenant.organization_id : '?'}`,
  );
  if (result.token) {
    setSessionCookie(res, result.token);
  }
  res.status(200).json(result);
}

/** Legacy shared endpoint: POST /auth/login signs in any actor. */
function login(req, res) {
  const { email, password, organization_id } = req.body;
  respondToLogin(
    res,
    email,
    authService.login(email, password, organization_id),
  );
}

/**
 * POST /auth/login/:actor — the endpoint the unified login page calls once it
 * has read the actor from the email. Rejects accounts of any other role.
 */
function loginAsActor(req, res) {
  const expectedRole =
    ACTOR_SLUG_TO_ROLE[String(req.params.actor).toLowerCase()];
  if (!expectedRole) {
    return res.status(404).json({
      message: `Unknown portal "${req.params.actor}"`,
      error: 'Not Found',
      statusCode: 404,
    });
  }
  const { email, password, organization_id } = req.body;
  respondToLogin(
    res,
    email,
    authService.login(email, password, organization_id, expectedRole),
  );
}

const SIGNUP_ERROR_RESPONSES = {
  EMAIL_TAKEN: [409, 'Email already registered', 'Conflict'],
  EMAIL_RESERVED: [
    400,
    'This address format is reserved for hospital staff. Please use your personal email.',
    'Bad Request',
  ],
  INVALID_ORGANIZATION: [
    400,
    'Selected organization is not available',
    'Bad Request',
  ],
};

function signup(req, res) {
  const result = authService.signup(req.body);
  if (result.error) {
    const [status, message, error] =
      SIGNUP_ERROR_RESPONSES[result.error] ||
      SIGNUP_ERROR_RESPONSES.INVALID_ORGANIZATION;
    return res.status(status).json({ message, error, statusCode: status });
  }
  logger.log(
    `✅ SIGNUP  patient_id=${result.patient.patient_id}  uhid=${result.patient.uhid}`,
  );
  if (result.token) {
    setSessionCookie(res, result.token);
  }
  res.status(201).json(result);
}

function me(req, res) {
  const result = authService.me(req.session);
  if (!result)
    return res.status(401).json({
      message: 'Authentication required',
      error: 'Unauthorized',
      statusCode: 401,
    });
  res.status(200).json(result);
}

function logout(req, res) {
  const token = extractToken(req) || (req.session && req.session.token);
  if (token) {
    authService.logout(token);
  }
  clearSessionCookie(res);
  res.status(200).json({ success: true });
}

/**
 * Explicit entitlement snapshot for the signed-in org — same data the
 * login/me `tenant` object carries, exposed on its own so the frontend can
 * refresh module/resource state without a full re-login. Backend stays the
 * source of truth (middleware/tenant.js#requireModule reads the same rows).
 */
function entitlements(req, res) {
  const organizationId = req.tenant && req.tenant.organizationId;
  if (!organizationId) {
    return res.status(403).json({
      message: 'This resource requires an active organization context',
      error: 'Forbidden',
      statusCode: 403,
    });
  }
  res.status(200).json(entitlementService.entitlementsFor(organizationId));
}

function demoAccounts(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      message: 'Demo accounts endpoint is disabled in production environment',
      error: 'Forbidden',
      statusCode: 403,
    });
  }
  res.status(200).json(authService.getDemoAccounts());
}

function changePassword(req, res) {
  try {
    const { newPassword, currentPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters',
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    const userId = req.session && req.session.userId;
    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required',
        error: 'Unauthorized',
        statusCode: 401,
      });
    }
    const result = authService.changePassword(userId, newPassword, currentPassword);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message || 'Failed to update password',
      error: err.name || 'Error',
      statusCode: err.status || 500,
    });
  }
}

module.exports = {
  login,
  loginAsActor,
  signup,
  me,
  logout,
  entitlements,
  demoAccounts,
  changePassword,
};
