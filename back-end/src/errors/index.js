'use strict';

/**
 * @module errors
 * Centralized Domain Error Definitions
 */

const AppError = require('./AppError');
const NotFoundError = require('./NotFoundError');
const UnauthorizedError = require('./UnauthorizedError');
const ForbiddenError = require('./ForbiddenError');
const ValidationError = require('./ValidationError');
const ConflictError = require('./ConflictError');

module.exports = {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
};
