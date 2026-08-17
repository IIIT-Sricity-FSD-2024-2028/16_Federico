'use strict';

const preRequestService = require('../services/preRequest.service');
const { sendResult } = require('../utils/sendResult');
const { forbidsOtherPatient } = require('../utils/patientOwnership');

const FORBIDDEN = { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 };

// A Patient session sees/touches only their own pre-requests; HOM/PRE/FA
// see everything (they're the ones acting on them).
function findAll(req, res) {
  const all = preRequestService.findAll();
  const visible = req.session && req.session.role === 'Patient' ? all.filter((p) => p.patient_id === req.session.patientId) : all;
  sendResult(res, visible, 200);
}

function findOne(req, res) {
  const request = preRequestService.findOne(+req.params.id);
  if (request && forbidsOtherPatient(req, request.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, request, 200);
}

function create(req, res) {
  if (forbidsOtherPatient(req, req.body.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  const createdBy = req.session ? req.session.userId : null;
  sendResult(res, preRequestService.create(req.body, createdBy), 201);
}

// A Patient may only cancel their OWN pending request (status → REJECTED
// with a reason) — not approve/admit themselves, reassign a bed, or
// touch anyone else's request. HOM/PRE make every other transition.
function update(req, res) {
  const existing = preRequestService.findOne(+req.params.id);
  if (!existing) return sendResult(res, null, 200);

  if (req.session && req.session.role === 'Patient') {
    if (forbidsOtherPatient(req, existing.patient_id)) return res.status(403).json(FORBIDDEN);

    const requestedFields = Object.keys(req.body);
    const disallowed = requestedFields.some((field) => !['status', 'reject_reason'].includes(field));
    if (disallowed || req.body.status !== 'REJECTED' || existing.status !== 'PENDING') {
      return res.status(403).json(FORBIDDEN);
    }
  }

  sendResult(res, preRequestService.update(+req.params.id, req.body), 200);
}

module.exports = { findAll, findOne, create, update };
