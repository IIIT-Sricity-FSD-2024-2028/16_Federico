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
  doctor: { read: ['HOM', 'PRE', 'FA', 'Patient'], write: ['HOM'] },
  // 'Patient' read/write is further restricted to their OWN record by
  // ownership checks in patient.controller.js (findOne/update/
  // findInsuranceByPatient/createInsurance) — this table alone doesn't
  // express per-record ownership, only which actors may attempt the call.
  patient: { read: ['HOM', 'PRE', 'FA', 'Patient'], write: ['HOM', 'PRE', 'Patient'] },
  ward: { read: ['HOM', 'PRE', 'FA'], write: ['HOM'] },
  inventory: { read: ['HOM', 'FA'], write: ['HOM'] },
  // 'Patient' read here only actually resolves for the single-record
  // views (findPatientBills/findReceiptsByPatient/findDischargeSummary,
  // all ownership-checked) and the shared services price list. The
  // list-all-across-everyone handlers sharing this same gate
  // (findAllPayments, findAllReceipts, findLedgerByAdmission,
  // findLedgerEntries) explicitly deny Patient in billing.controller.js
  // since there's no single patientId to scope them to.
  billing: { read: ['HOM', 'FA', 'Patient'], write: ['FA'] },
  // Scoped narrower than 'billing' write: a Patient may only ever POST
  // their own payment (the "Pay Now" action, enforced in the controller
  // by ledger ownership) — never create services/ledgers/entries or
  // dispatch a bill, which stay FA-only under 'billing'.
  payment: { write: ['FA', 'Patient'] },
  // Legacy Phase-1 appointment resource: PRE-only for actor-based write.
  // The Patient-facing booking flow goes through 'preRequest' instead
  // (properly ownership-scoped there) — this endpoint has no per-record
  // ownership check, so Patient is deliberately NOT granted write here.
  appointment: { read: ['HOM', 'PRE', 'FA'], write: ['PRE'] },
  admission: { read: ['HOM', 'PRE', 'FA'], write: ['HOM', 'PRE'] },
  // Patient may read/write pre-requests, but only their OWN (findAll
  // filters to it, findOne/update 403 on mismatch), and only ever CANCEL
  // one of their own PENDING requests (update rejects any other field or
  // status change from a Patient session) — see preRequest.controller.js.
  preRequest: { read: ['HOM', 'PRE', 'FA', 'Patient'], write: ['PRE', 'Patient'] },
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
