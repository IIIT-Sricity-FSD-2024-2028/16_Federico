const AppError = require('./AppError');

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN', details = null) {
    super(message, 403, code, details);
  }
}

module.exports = ForbiddenError;
