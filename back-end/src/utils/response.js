'use strict';

/**
 * response.js
 * Standardized API Response formatter for all HTTP endpoints.
 */

/**
 * Sends a standardized success JSON response.
 * @param {import('express').Response} res
 * @param {any} [data=null]
 * @param {number} [statusCode=200]
 * @param {object} [meta={}]
 */
function sendSuccess(res, data = null, statusCode = 200, meta = {}) {
  const payload = {
    success: true,
    statusCode,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  return res.status(statusCode).json(payload);
}

/**
 * Sends a standardized error JSON response.
 * @param {import('express').Response} res
 * @param {Error|object} error
 * @param {number} [defaultStatusCode=500]
 */
function sendError(res, error, defaultStatusCode = 500) {
  const statusCode = error.statusCode || defaultStatusCode;
  const payload = {
    success: false,
    statusCode,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred.',
      details: error.details || null,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
  sendError,
};
