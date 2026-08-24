'use strict';

const AppError = require('./AppError');

/**
 * NotFoundError
 * Represents an HTTP 404 Not Found domain error.
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND', details = null) {
    super(message, 404, code, details);
  }
}

module.exports = NotFoundError;
