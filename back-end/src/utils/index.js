'use strict';

/**
 * @module utils
 * Central Utilities Export Registry
 */

const { createLogger } = require('./logger');
const { hashPassword, hashPasswordAsync, verifyPassword, verifyPasswordAsync } = require('./password');
const { forbidsOtherPatient, isPatientSession } = require('./patientOwnership');
const { sendSuccess, sendError } = require('./response');
const { ROLE_ID_TO_NAME, ROLE_NAME_TO_ID } = require('./roles');
const { sendResult } = require('./sendResult');
const { MODULES, MODULE_CODES, withTenant, scopeToOrg, belongsToOrg } = require('./tenant');

module.exports = {
  createLogger,
  hashPassword,
  hashPasswordAsync,
  verifyPassword,
  verifyPasswordAsync,
  forbidsOtherPatient,
  isPatientSession,
  sendSuccess,
  sendError,
  ROLE_ID_TO_NAME,
  ROLE_NAME_TO_ID,
  sendResult,
  MODULES,
  MODULE_CODES,
  withTenant,
  scopeToOrg,
  belongsToOrg,
};
