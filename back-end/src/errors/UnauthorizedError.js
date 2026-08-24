const AppError = require('./AppError');

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED', details = null) {
    super(message, 401, code, details);
  }
}

module.exports = UnauthorizedError;
