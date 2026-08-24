'use strict';

const preRequestService = require('../services/preRequest.service');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError } = require('../errors');
const { forbidsOtherPatient } = require('../utils/patientOwnership');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

// A Patient session sees/touches only their own pre-requests; HOM/PRE/FA
// see everything (within their own organization).
function findAll(req, res) {
  const all = scopeToOrg(preRequestService.findAll(), req);
  const visible =
    req.session && req.session.role === 'Patient'
      ? all.filter((p) => p.patient_id === req.session.patientId)
      : all;
  sendSuccess(res, visible, 200);
}

function findOne(req, res) {
  const request = preRequestService.findOne(+req.params.id);
  if (
    request &&
    (forbidsOtherPatient(req, request.patient_id) ||
      !belongsToOrg(request, req))
  ) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, request, 200);
}

function create(req, res) {
  if (forbidsOtherPatient(req, req.body.patient_id)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  const createdBy = req.session ? req.session.userId : null;
  sendSuccess(
    res,
    preRequestService.create(withTenant(req, req.body), createdBy),
    201,
  );
}

const PUBLICLY_SETTABLE_STATUSES = new Set([
  'APPROVED',
  'REJECTED',
  'EMERGENCY',
  'CONSULTATION_DONE',
  'DISCHARGE_REQUESTED',
  'DISCHARGE_APPROVED',
  'DISCHARGED',
]);

function update(req, res) {
  const existing = preRequestService.findOne(+req.params.id);
  if (!existing) return sendSuccess(res, null, 200);

  if (
    forbidsOtherPatient(req, existing.patient_id) ||
    !belongsToOrg(existing, req)
  ) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }

  const requestedStatus = req.body.status;

  if (requestedStatus !== undefined) {
    if (requestedStatus === 'ADMITTED') {
      return sendError(res, new ForbiddenError('ADMITTED status must be reached via bed allocation cascade'), 403);
    }

    if (req.session && req.session.role === 'Patient') {
      const requestedFields = Object.keys(req.body);
      const onlyAllowedFields = requestedFields.every((field) =>
        ['status', 'reject_reason'].includes(field),
      );
      if (!onlyAllowedFields) {
        return sendError(res, new ForbiddenError('Patients may only update status or reject_reason'), 403);
      }
    }

    if (!PUBLICLY_SETTABLE_STATUSES.has(requestedStatus)) {
      return sendError(res, new ForbiddenError(`Status ${requestedStatus} cannot be set directly`), 403);
    }

    if (
      req.session &&
      !preRequestService.canTransition(
        existing.status,
        requestedStatus,
        req.session.role,
      )
    ) {
      return sendError(res, new ForbiddenError(`Actor ${req.session.role} cannot transition from ${existing.status} to ${requestedStatus}`), 403);
    }

    return sendSuccess(
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
    return sendError(res, new ForbiddenError('Forbidden: Only PRE/HOM staff can reschedule requests'), 403);
  }

  sendSuccess(
    res,
    preRequestService.updateFields(existing.pre_request_id, req.body),
    200,
  );
}

module.exports = { findAll, findOne, create, update };
