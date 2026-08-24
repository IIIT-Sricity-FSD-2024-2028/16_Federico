'use strict';

const AppError = require('./AppError');

/**
 * ConflictError
 * Represents an HTTP 409 Conflict domain error (e.g. duplicate email, unique constraint violation).
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', details = null) {
    super(message, 409, code, details);
  }
}

module.exports = ConflictError;
