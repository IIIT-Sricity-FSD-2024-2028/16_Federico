'use strict';

const preRequestService = require('../services/preRequest.service');
const billingService = require('../services/billing.service');
const dataStore = require('../store/dataStore');
const { sendResult } = require('../utils/sendResult');
const { forbidsOtherPatient } = require('../utils/patientOwnership');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

// PRE's final discharge sign-off (DISCHARGE_APPROVED -> DISCHARGED) is the
// step that physically releases the bed. It must not happen until Finance
// has confirmed the patient's bill is fully paid. Returns a human-readable
// reason string when discharge should be blocked, or null when it may
// proceed.
function dischargeBlockReason(patientId) {
  const pid = Number(patientId);
  const patientAdmissions = dataStore.admissions.filter((a) => a.patient_id === pid);
  if (patientAdmissions.length === 0) return null;
  const admission =
    patientAdmissions.find((a) => a.status !== 'DISCHARGED') ||
    patientAdmissions[patientAdmissions.length - 1];

  const ledger = billingService.findLedgerByAdmission(admission.admission_id);
  if (!ledger) {
    return 'Cannot finalize discharge — Finance has not opened a billing ledger for this admission yet.';
  }
  if (ledger.status !== 'PAID') {
    return 'Cannot finalize discharge — the patient bill has not been cleared by Finance yet.';
  }
  return null;
}

const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

// A Patient session sees/touches only their own pre-requests; HOM/PRE/FA
// see everything (within their own organization).
function findAll(req, res) {
  const all = scopeToOrg(preRequestService.findAll(), req);
  const visible =
    req.session && req.session.role === 'Patient'
      ? all.filter((p) => p.patient_id === req.session.patientId)
      : all;
  sendResult(res, visible, 200);
}

function findOne(req, res) {
  const request = preRequestService.findOne(+req.params.id);
  if (
    request &&
    (forbidsOtherPatient(req, request.patient_id) ||
      !belongsToOrg(request, req))
  ) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, request, 200);
}

function create(req, res) {
  if (forbidsOtherPatient(req, req.body.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  const createdBy = req.session ? req.session.userId : null;
  sendResult(
    res,
    preRequestService.create(withTenant(req, req.body), createdBy),
    201,
  );
}

// ADMITTED is reachable ONLY through the ward bed-allocation cascade
// (ward.service.js#updateBedRequest calling preRequestService.transition
// internally) — never directly via this endpoint, so there is exactly
// one code path that assigns a bed and flips this status, not the three
// different uncoordinated ones the original frontend had.
const PUBLICLY_SETTABLE_STATUSES = new Set([
  'APPROVED',
  'REJECTED',
  'EMERGENCY',
  'CONSULTATION_DONE',
  'DISCHARGE_REQUESTED',
  'DISCHARGE_APPROVED',
  'DISCHARGED',
]);

/**
 * PUT /pre-requests/:id — two distinct kinds of update, split by whether
 * `status` is present in the body:
 *  - status present -> a state transition. Validated against the actor's
 *    permitted moves in preRequestService.TRANSITIONS. A session-less
 *    legacy x-role SUPER_USER call skips the actor check (same "admin can
 *    do anything" bypass every other resource already has).
 *  - status absent -> a field update (doctor/date/time/department), PRE
 *    only (rescheduling), never Patient.
 */
function update(req, res) {
  const existing = preRequestService.findOne(+req.params.id);
  if (!existing) return sendResult(res, null, 200);

  if (
    forbidsOtherPatient(req, existing.patient_id) ||
    !belongsToOrg(existing, req)
  )
    return res.status(403).json(FORBIDDEN);

  const requestedStatus = req.body.status;

  if (requestedStatus !== undefined) {
    if (requestedStatus === 'ADMITTED') return res.status(403).json(FORBIDDEN);

    if (req.session && req.session.role === 'Patient') {
      const requestedFields = Object.keys(req.body);
      const onlyAllowedFields = requestedFields.every((field) =>
        ['status', 'reject_reason'].includes(field),
      );
      if (!onlyAllowedFields) return res.status(403).json(FORBIDDEN);
    }

    if (!PUBLICLY_SETTABLE_STATUSES.has(requestedStatus))
      return res.status(403).json(FORBIDDEN);

    if (requestedStatus === 'DISCHARGED') {
      const blockReason = dischargeBlockReason(existing.patient_id);
      if (blockReason) {
        return res
          .status(409)
          .json({ message: blockReason, error: 'Conflict', statusCode: 409 });
      }
    }

    // Legacy x-role-only callers (no real session) bypass the per-actor
    // transition check, matching every other resource's SUPER_USER bypass.
    if (
      req.session &&
      !preRequestService.canTransition(
        existing.status,
        requestedStatus,
        req.session.role,
      )
    ) {
      return res.status(403).json(FORBIDDEN);
    }

    return sendResult(
      res,
      preRequestService.transition(
        existing.pre_request_id,
        requestedStatus,
        req.session?.role,
        req.body,
      ),
      200,
    );
  }

  if (req.session && req.session.role !== 'PRE' && req.session.role !== 'HOM') {
    return res.status(403).json(FORBIDDEN);
  }

  sendResult(
    res,
    preRequestService.updateFields(existing.pre_request_id, req.body),
    200,
  );
}

function checkIn(req, res) {
  const existing = preRequestService.findOne(+req.params.id);
  if (!existing) return sendResult(res, null, 404);

  if (!belongsToOrg(existing, req)) {
    return res.status(403).json(FORBIDDEN);
  }

  const result = preRequestService.checkIn(
    existing.pre_request_id,
    req.body,
    req.tenant?.organizationId,
    req.tenant?.hospitalId,
    req.session?.role || 'PRE',
  );

  sendResult(res, result, 200);
}

module.exports = { findAll, findOne, create, update, checkIn };
