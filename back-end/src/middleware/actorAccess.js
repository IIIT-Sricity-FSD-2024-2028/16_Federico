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
const dataStore = require('../store/dataStore');

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
  // Scoped narrower than 'billing' write in the other direction: HOM
  // creates/dispatches nothing, but DOES post individual ledger entries
  // when logging inventory usage against an admitted patient's ledger
  // (inventory.js's "Post Usage to Patient" flow) — the ledger itself
  // must already exist (created by FA), HOM can only add line items to it.
  ledgerEntry: { write: ['FA', 'HOM'] },
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
  // HOM needs write here too: DISCHARGE_REQUESTED -> DISCHARGE_APPROVED
  // is a HOM-only move in preRequestService.TRANSITIONS, and this gate
  // is what lets the request reach that check in the first place — this
  // exact class of bug (transition table says an actor can move
  // somewhere, but the route-level gate never lets their request
  // through to be checked) is what the full-lifecycle e2e test below
  // caught.
  preRequest: { read: ['HOM', 'PRE', 'FA', 'Patient'], write: ['HOM', 'PRE', 'Patient'] },
  // Org-scoped custom-role administration (tasks.md §9 Dynamic RBAC) is an
  // organization-admin responsibility — HOM is this app's org-admin actor.
  rbac: { read: ['HOM'], write: ['HOM'] },
};

/**
 * Dynamic RBAC — org-defined custom roles (tasks.md §9), OR'd into
 * `authorize()` alongside the two static checks below. Purely additive:
 * every existing `authorize(['SUPER_USER'], 'ward', 'write')` call site
 * keeps working unchanged for the four fixed SRS actors; this only ever
 * grants ADDITIONAL access to a staff user who's been assigned a custom
 * role carrying the matching `resource:mode` permission. Deliberately
 * separate from `ACTOR_ACCESS` (a static, fixed table) rather than
 * replacing it — see `src/store/dataStore.js`'s `roles` table, which is
 * the fixed 4-actor table this must never collide with; custom roles live
 * in `customRoles`/`permissions`/`rolePermissions`/`staffRoleAssignments`.
 */
function dynamicRoleGrants(req, resource, mode) {
  if (!req.session || !req.session.userId || !req.tenant || !req.tenant.organizationId) return false;
  const permissionCode = `${resource}:${mode}`;
  const permission = dataStore.permissions.find((p) => p.permission_code === permissionCode);
  if (!permission) return false;

  const assignedRoleIds = dataStore.staffRoleAssignments
    .filter((a) => a.user_id === req.session.userId)
    .map((a) => a.custom_role_id);
  if (assignedRoleIds.length === 0) return false;

  const orgRoleIds = new Set(
    dataStore.customRoles.filter((r) => assignedRoleIds.includes(r.custom_role_id) && r.organization_id === req.tenant.organizationId).map((r) => r.custom_role_id),
  );
  if (orgRoleIds.size === 0) return false;

  return dataStore.rolePermissions.some((rp) => orgRoleIds.has(rp.custom_role_id) && rp.permission_id === permission.permission_id);
}

/**
 * `authorize(legacyRoles, resource, mode)` — combined guard. A request
 * passes if ANY of three independent checks pass:
 *  - legacy `x-role` header (Phase 1 contract, untouched)
 *  - the caller's fixed actor role is in `ACTOR_ACCESS[resource][mode]`
 *  - the caller has a custom role (this org) granting `resource:mode`
 * `legacyRoles`: e.g. ['ADMIN', 'SUPER_USER'] or ['SUPER_USER'], exactly
 * what the Phase 1 route already required for this handler.
 */
function authorize(legacyRoles, resource, mode) {
  return function (req, res, next) {
    const legacyOk = legacyRoles.includes(req.headers['x-role']);
    const allowedActors = ACTOR_ACCESS[resource]?.[mode] || [];
    const actorOk = Boolean(req.session && allowedActors.includes(req.session.role));
    const dynamicOk = dynamicRoleGrants(req, resource, mode);

    if (legacyOk || actorOk || dynamicOk) return next();

    return res.status(403).json({
      message: 'Forbidden resource',
      error: 'Forbidden',
      statusCode: 403,
    });
  };
}

module.exports = { authorize, ACTOR_ACCESS };
