'use strict';

/**
 * Phase 2 permission matrix for the four real SRS actors (HOM, PRE, FA,
 * Patient), layered ADDITIVELY on top of the Phase 1 legacy `x-role`
 * guard (`ADMIN`/`SUPER_USER`) — a request is allowed if EITHER check
 * passes, so nothing that worked against the Phase-1-migrated routes
 * (test-all-endpoints.ps1, Swagger "try it out") stops working.
 *
 * Responsibilities follow the SRS actor descriptions (SRS.pdf section
 * 3): PRE owns patient/appointment intake, HOM owns wards/beds/doctors/
 * inventory operations, FA owns billing, Patient can read their own
 * things and book appointments.
 */
const ACTOR_ACCESS = {
  doctor: { read: ['HOM', 'PRE', 'FA'], write: ['HOM'] },
  patient: { read: ['HOM', 'PRE', 'FA'], write: ['HOM', 'PRE'] },
  ward: { read: ['HOM', 'PRE', 'FA'], write: ['HOM'] },
  inventory: { read: ['HOM', 'FA'], write: ['HOM'] },
  billing: { read: ['HOM', 'FA', 'Patient'], write: ['FA'] },
  appointment: { read: ['HOM', 'PRE', 'FA'], write: ['PRE', 'Patient'] },
  admission: { read: ['HOM', 'PRE', 'FA'], write: ['HOM', 'PRE'] },
};

/**
 * `authorize(legacyRoles, resource, mode)` — combined guard.
 * `legacyRoles`: e.g. ['ADMIN', 'SUPER_USER'] or ['SUPER_USER'], exactly
 * what the Phase 1 route already required for this handler.
 */
function authorize(legacyRoles, resource, mode) {
  return function (req, res, next) {
    const legacyOk = legacyRoles.includes(req.headers['x-role']);
    const allowedActors = ACTOR_ACCESS[resource]?.[mode] || [];
    const actorOk = Boolean(req.session && allowedActors.includes(req.session.role));

    if (legacyOk || actorOk) return next();

    return res.status(403).json({
      message: 'Forbidden resource',
      error: 'Forbidden',
      statusCode: 403,
    });
  };
}

module.exports = { authorize, ACTOR_ACCESS };
