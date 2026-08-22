'use strict';

/**
 * Port of the NestJS AppModule's global middleware (registered on '*' in
 * `configure()`), which logged `METHOD url status - duration ms` via
 * Nest's Logger under the 'HTTP' context. Nest's Logger prefixes lines with
 * `[Nest] <pid>  - <timestamp>     LOG [HTTP] <message>`; we keep the
 * `[HTTP]`-tagged message body identical and use a plain console prefix
 * since there is no Nest Logger to preserve here.
 */
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
