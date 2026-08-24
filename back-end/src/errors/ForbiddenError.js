'use strict';

const AppError = require('./AppError');

/**
 * ForbiddenError
 * Represents an HTTP 403 Forbidden domain error (e.g. insufficient permissions, cross-tenant violation).
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN', details = null) {
    super(message, 403, code, details);
  }
}

module.exports = ForbiddenError;
