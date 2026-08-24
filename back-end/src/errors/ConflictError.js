const AppError = require('./AppError');

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', details = null) {
    super(message, 409, code, details);
  }
}

module.exports = ConflictError;
