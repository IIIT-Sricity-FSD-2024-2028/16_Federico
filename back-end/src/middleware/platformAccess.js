'use strict';

/**
 * Gate for `/platform/*` routes — the Platform Super User's own space.
 * Deliberately NOT built on `actorAccess.js#authorize` (which is about
 * org-actor resources): tasks.md §3 is explicit that the Platform Super
 * User manages the SaaS platform and organizations, and CANNOT view
 * patient records, edit appointments, modify bills, access inventory, or
 * access doctor information. Keeping this as a wholly separate gate,
 * checked against `platformSuperUsers` sessions only (never the org
 * `users`/`roles` tables `authorize()` checks), makes that separation a
 * structural fact rather than a convention someone could accidentally
 * blur later by adding 'PLATFORM' to an org ACTOR_ACCESS list.
 */
function requirePlatformUser(req, res, next) {
  if (!req.session || !req.session.isPlatformUser) {
    return res.status(403).json({ message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 });
  }
  next();
}

module.exports = { requirePlatformUser };
