'use strict';

const authService = require('../services/auth.service');
const { createLogger } = require('../utils/logger');

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
};

const { extractToken } = require('../middleware/session');

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `sessionId=${token}; Path=/; HttpOnly; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
}

function login(req, res) {
  const { email, password, organization_id } = req.body;
  const result = authService.login(email, password, organization_id);
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

const SIGNUP_ERROR_RESPONSES = {
  EMAIL_TAKEN: [409, 'Email already registered', 'Conflict'],
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

module.exports = { login, signup, me, logout };
