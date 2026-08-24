'use strict';

const AppError = require('./AppError');

/**
 * ValidationError
 * Represents an HTTP 400 Bad Request / Validation domain error.
 */
class ValidationError extends AppError {
  /**
   * @param {string} [message='Validation failed']
   * @param {any} [details=null] - Field validation error array or details object
   * @param {string} [code='VALIDATION_ERROR']
   */
  constructor(message = 'Validation failed', details = null, code = 'VALIDATION_ERROR') {
    // Support (message, code, details) or (message, details, code) flexibly
    let finalCode = code;
    let finalDetails = details;
    if (typeof details === 'string' && typeof code === 'object') {
      finalCode = details;
      finalDetails = code;
    }
    super(message, 400, finalCode, finalDetails);
  }
}

module.exports = ValidationError;
