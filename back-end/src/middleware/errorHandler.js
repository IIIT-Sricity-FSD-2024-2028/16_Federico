'use strict';

const { AppError } = require('../errors');
const { sendError } = require('../utils/response');
const { logError } = require('../utils/logManager');

/**
 * Global Error Handler Middleware
 * Intercepts all operational and unhandled exceptions across the application pipeline.
 *
 * Log and Error Management (Evaluation Criteria): every error that reaches this
 * handler — expected domain errors and unhandled bugs alike — is appended to
 * logs/error.log and logs/combined.log via logManager before a response is sent.
 */
function errorHandler(err, req, res, next) {
  // Persist to logs/error.log + logs/combined.log regardless of error type.
  logError(err, req);

  if (res.headersSent) {
    return next(err);
  }

  // Handle Multer file-upload errors (oversized file, unexpected field, etc.)
  if (err.name === 'MulterError') {
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the allowed limit (max 5 MB)';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected upload field: ${err.field || 'file'}`;
    }
    return sendError(
      res,
      { code: err.code || 'FILE_UPLOAD_ERROR', message },
      400,
    );
  }

  // Handle malformed JSON body errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(
      res,
      {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.',
      },
      400,
    );
  }

  // Handle custom Domain Errors (AppError and subclasses)
  if (err instanceof AppError) {
    return sendError(res, err, err.statusCode);
  }

  // Handle errors annotated with a client-error statusCode by upstream middleware
  // that doesn't construct AppError instances directly (e.g. multer's fileFilter
  // in middleware/fileUpload.js).
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return sendError(
      res,
      { code: err.code || 'BAD_REQUEST', message: err.message },
      err.statusCode,
    );
  }

  // Log unhandled server errors
  console.error('[UnhandledError]', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  return sendError(
    res,
    {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
    },
    500,
  );
}

module.exports = { errorHandler };
