'use strict';

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
