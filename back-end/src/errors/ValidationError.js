const AppError = require('./AppError');

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null, code = 'VALIDATION_ERROR') {
    super(message, 400, code, details);
  }
}

module.exports = ValidationError;
