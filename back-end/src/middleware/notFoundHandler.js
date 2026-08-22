'use strict';

/**
 * Matches Nest's default 404 for a route that matches no handler at all
 * (distinct from a matched handler whose lookup misses, which returns
 * null/200 per the original in-memory services). Verified empirically:
 * `GET /unmatched` on the original NestJS server returns
 * {"message":"Cannot GET /unmatched","error":"Not Found","statusCode":404}.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl.split('?')[0]}`,
    error: 'Not Found',
    statusCode: 404,
  });
}

module.exports = { notFoundHandler };
