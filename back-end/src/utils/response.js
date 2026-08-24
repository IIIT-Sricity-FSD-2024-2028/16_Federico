/**
 * response.js
 * Standardized API Response formatter for all HTTP endpoints.
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
