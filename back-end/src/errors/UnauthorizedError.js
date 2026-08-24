'use strict';

const AppError = require('./AppError');

/**
 * UnauthorizedError
 * Represents an HTTP 401 Unauthorized domain error (e.g. missing or invalid authentication token).
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED', details = null) {
    super(message, 401, code, details);
  }
}

module.exports = UnauthorizedError;
