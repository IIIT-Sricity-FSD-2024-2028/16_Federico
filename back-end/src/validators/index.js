'use strict';

/**
 * @module validators
 * Central Request Body Validation Schemas & Engine
 */

const { validateBody, partial, CHECKS, MESSAGES } = require('./engine');
const admissionValidators = require('./admission.validators');
const appointmentValidators = require('./appointment.validators');
const authValidators = require('./auth.validators');
const billingValidators = require('./billing.validators');
const doctorValidators = require('./doctor.validators');
const inventoryValidators = require('./inventory.validators');
const patientValidators = require('./patient.validators');
const platformValidators = require('./platform.validators');
const preRequestValidators = require('./preRequest.validators');
const rbacValidators = require('./rbac.validators');
const requestValidators = require('./request.validators');
const wardValidators = require('./ward.validators');

module.exports = {
  validateBody,
  partial,
  CHECKS,
  MESSAGES,
  ...admissionValidators,
  ...appointmentValidators,
  ...authValidators,
  ...billingValidators,
  ...doctorValidators,
  ...inventoryValidators,
  ...patientValidators,
  ...platformValidators,
  ...preRequestValidators,
  ...rbacValidators,
  ...requestValidators,
  ...wardValidators,
};
