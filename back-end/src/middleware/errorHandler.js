'use strict';

/**
 * Defensive fallback matching Nest's default shape for an uncaught
 * exception. None of the ported route handlers are expected to throw
 * (they're synchronous, in-memory operations with no external I/O), but
 * this keeps the error contract consistent if one ever does.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({
    message: 'Internal server error',
    error: 'Internal Server Error',
    statusCode: 500,
  });
}

module.exports = { errorHandler };
