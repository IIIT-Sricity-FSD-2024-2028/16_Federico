/**
 * AppError.js
 * Base class for all operational/domain exceptions in the application.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 500)
   * @param {string} code - Machine-readable error code (e.g. 'NOT_FOUND')
   * @param {any} [details=null] - Optional detailed error context or array of field validation errors
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
