'use strict';


function requestLogger(req, res, next) {
  const { method, originalUrl } = req;
  const start = Date.now();
  res.on('finish', () => {
    const { statusCode } = res;
    const duration = Date.now() - start;
    console.log(
      `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
    );
  });
  next();
}

module.exports = { requestLogger };
