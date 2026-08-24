'use strict';

const { AppError } = require('../errors');
const { sendError } = require('../utils/response');

/**
 * Global Error Handler Middleware
 * Intercepts all operational and unhandled exceptions across the application pipeline.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
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
