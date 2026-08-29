'use strict';

/**
 * Usage-metering route handler factory — the "per-hit platform fee" hook.
 *
 * `meter(moduleCode)` returns an ordinary Express handler that is mounted in
 * `src/routes/index.js` in front of a feature router. It records ONE billable
 * business event per inbound request that the owning module's router handled
 * successfully for a tenant organization:
 *
 *   - method is not GET (state-changing only — reads are never billed)
 *   - response status < 400 (a 403 from requireModule / RBAC is never counted)
 *   - req.tenant.organizationId is set (platform users / unauthenticated -> skipped)
 *
 * All work happens on the response `finish` event, so this never delays or
 * alters the response, and any failure inside it is swallowed — metering is
 * best-effort and must not break a request.
 *
 * NOTE: this is deliberately NOT placed in src/middleware/. It is route wiring,
 * mounted per-prefix in the route manifest, and touches none of the mandatory
 * middleware chain.
 */

function meter(moduleCode) {
  const code = String(moduleCode).toUpperCase();

  return function meterHandler(req, res, next) {
    res.on('finish', () => {
      try {
        if (req.method === 'GET') return;
        if (res.statusCode >= 400) return;
        const orgId = req.tenant && req.tenant.organizationId;
        if (!orgId) return;
        // Lazy require avoids a load-order cycle with the store.
        require('./metrics.service').increment(orgId, code, req.method);
      } catch (_err) {
        /* best-effort — never surface metering failures to the client */
      }
    });
    next();
  };
}

module.exports = { meter };
