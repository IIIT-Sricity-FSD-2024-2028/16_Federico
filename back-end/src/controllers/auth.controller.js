'use strict';

const authService = require('../services/auth.service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('🔐 Auth');

function login(req, res) {
  const { email, password } = req.body;
  const result = authService.login(email, password);
  if (result.error) {
    logger.log(`❌ LOGIN FAILED  email=${email}`);
    return res.status(401).json({ message: 'Invalid email or password', error: 'Unauthorized', statusCode: 401 });
  }
  logger.log(`✅ LOGIN  role=${result.role}  email=${email}`);
  res.status(200).json(result);
}

function signup(req, res) {
  const result = authService.signup(req.body);
  if (result.error === 'EMAIL_TAKEN') {
    return res.status(409).json({ message: 'Email already registered', error: 'Conflict', statusCode: 409 });
  }
  logger.log(`✅ SIGNUP  patient_id=${result.patient.patient_id}  uhid=${result.patient.uhid}`);
  res.status(201).json(result);
}

function me(req, res) {
  const result = authService.me(req.session);
  if (!result) return res.status(401).json({ message: 'Authentication required', error: 'Unauthorized', statusCode: 401 });
  res.status(200).json(result);
}

function logout(req, res) {
  const header = req.headers['authorization'] || '';
  const [, token] = header.split(' ');
  if (token) authService.logout(token);
  res.status(200).json({ success: true });
}

module.exports = { login, signup, me, logout };
