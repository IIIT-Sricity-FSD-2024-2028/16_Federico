'use strict';

/**
 * Nest serializes a controller method's `null`/`undefined` return value to
 * an EMPTY response body (not the text "null"), still with a 200/201
 * status. Verified empirically against the running NestJS server (e.g.
 * `GET /doctor/999999` on a miss returns an empty body with status 200).
 * Express's `res.json(null)` would instead send the 4-byte body "null",
 * so this helper special-cases it to stay behavior-identical.
 */
function sendResult(res, result, status = 200) {
  if (result === null || result === undefined) {
    return res.status(status).end();
  }
  return res.status(status).json(result);
}

module.exports = { sendResult };
