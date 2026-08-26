'use strict';

const { logError } = require('../utils/logManager');

function errorHandler(err, req, res, next) {
  // 1. Log error to file (logs/error.log) and console
  console.error(`[Error] ${err.name || 'Error'}: ${err.message}`, err.stack || '');
  logError(err, req);

  if (res.headersSent) {
    return next(err);
  }

  // 2. Handle specific error types
  // Multer File Upload Errors
  if (err.name === 'MulterError') {
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the allowed limit (max 5 MB)';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected upload field: ${err.field || 'file'}`;
    }
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // JSON / Syntax Errors in Body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Malformed JSON payload in request body',
      timestamp: new Date().toISOString(),
    });
  }

  // Custom Application Status Code Errors
  const statusCode = err.statusCode || err.status || 500;
  const errorName = statusCode >= 500 ? 'Internal Server Error' : (err.name || 'Bad Request');
  const message = err.message || (statusCode >= 500 ? 'Internal server error' : 'An error occurred');

  res.status(statusCode).json({
    statusCode,
    error: errorName,
    message,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { errorHandler };
