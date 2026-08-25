'use strict';

const { logAccess } = require('../utils/logManager');

function requestLogger(req, res, next) {
  const { method, originalUrl } = req;
  const start = Date.now();

  res.on('finish', () => {
    const { statusCode } = res;
    const duration = Date.now() - start;

    // 1. Console Output
    console.log(
      `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
    );

    // 2. Persistent File Log (stored in logs/access.log & logs/combined.log at regular intervals)
    logAccess(req, res, duration);
  });

  next();
}

module.exports = { requestLogger };
