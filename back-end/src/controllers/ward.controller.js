'use strict';

const wardService = require('../services/ward.service');
const preRequestService = require('../services/preRequest.service');
const admissionService = require('../services/admission.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('🏨 Wards');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

function findAllWards(req, res) {
  sendResult(res, scopeToOrg(wardService.findAllWards(), req), 200);
}

function createWard(req, res) {
  const result = wardService.createWard(withTenant(req, req.body));
  logger.log(
    `✅ CREATED WARD  id=${result.ward_id}  name="${result.ward_name}"`,
  );
  sendResult(res, result, 201);
}

function updateWard(req, res) {
  const existing = wardService
    .findAllWards()
    .find((w) => w.ward_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);

  const result = wardService.updateWard(+req.params.id, req.body);
  if (result && result.error) {
    return res.status(400).json({
      message: result.message,
      error: 'Bad Request',
      statusCode: 400,
    });
  }
  logger.log(`✏️  WARD UPDATE  ward_id=${req.params.id}`);
  sendResult(res, result, 200);
}

function deleteWard(req, res) {
  const existing = wardService
    .findAllWards()
    .find((w) => w.ward_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);

  const result = wardService.deleteWard(+req.params.id);
  if (result && result.error) {
    return res.status(400).json({
      message: result.message,
      error: 'Bad Request',
      statusCode: 400,
    });
  }
  logger.log(`🗑️  WARD DELETED  ward_id=${req.params.id}`);
  sendResult(res, result, 200);
}

function findAllBeds(req, res) {
  sendResult(res, scopeToOrg(wardService.findAllBeds(), req), 200);
}

function findBedsByWard(req, res) {
  const existing = wardService
    .findAllWards()
    .find((w) => w.ward_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);

  sendResult(res, wardService.findBedsByWard(+req.params.id), 200);
}

function createBed(req, res) {
  const result = wardService.createBed(withTenant(req, req.body));
  logger.log(
    `✅ CREATED BED  id=${result.bed_id}  ward_id=${result.ward_id}  number=${result.bed_number}`,
  );
  sendResult(res, result, 201);
}

function updateBedStatus(req, res) {
  const { bedId } = req.params;
  const existing = wardService.findAllBeds().find((b) => b.bed_id === +bedId);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  const result = wardService.updateBedStatus(+bedId, req.body.status);
  logger.log(`✏️  BED UPDATE  bed_id=${bedId}  status="${req.body.status}"`);
  sendResult(res, result, 200);
}

function findAllBedRequests(req, res) {
  sendResult(res, scopeToOrg(wardService.findAllBedRequests(), req), 200);
}

function createBedRequest(req, res) {
  const requestedBy = req.session ? req.session.userId : null;
  const result = wardService.createBedRequest(
    withTenant(req, req.body),
    requestedBy,
  );
  logger.log(
    `✅ BED REQUEST  id=${result.bed_request_id}  patient=${result.patient_id}`,
  );
  sendResult(res, result, 201);
}

// Bed allocation is the ONE place that drives a pre-request into
// ADMITTED (see preRequest.controller.js's PUBLICLY_SETTABLE_STATUSES —
// that endpoint refuses to set ADMITTED directly). Orchestrated here in
// the controller rather than inside either service, to avoid a
// ward.service <-> preRequest.service circular require.
//
// This is also the ONE place an `admission` record gets created. Nothing
// upstream (PRE's bed-request, the pre-request itself) ever produced one,
// which left billing.service's admission_id-keyed ledger lookups with no
// admission to attach to — a dead end for FA's billing flow. Bed
// allocation is the natural anchor: it's the moment patient_id + bed_id
// are both known for certain.
// FIX: Added `next` so caught errors are forwarded to Express's global
// errorHandler instead of being re-thrown from a synchronous handler.
// A bare `throw` inside a sync Express handler that has no `next` becomes
// an unhandled exception and crashes the entire Node.js process.
function updateBedRequest(req, res, next) {
  const existing = wardService
    .findAllBedRequests()
    .find((r) => r.bed_request_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);

  const result = wardService.updateBedRequest(+req.params.id, req.body);

  // HOM's rejection applies to the linked PRE admission request too. Keep
  // both existing records in sync by their pre_request_id; do not create a
  // second request or lose the original request details.
  if (result && result.status === 'REJECTED' && result.pre_request_id) {
    const actorRole = req.session ? req.session.role : 'HOM';
    preRequestService.rejectAdmissionRequest(result.pre_request_id, actorRole);
  }

  if (result && result.status === 'ALLOCATED') {
    let appointmentId = null;

    try {
      if (result.pre_request_id) {
        const preRequest = preRequestService.findOne(result.pre_request_id);
        const actorRole = req.session ? req.session.role : 'HOM';
        if (
          preRequest &&
          preRequestService.canTransition(
            preRequest.status,
            'ADMITTED',
            actorRole,
          )
        ) {
          preRequestService.transition(
            result.pre_request_id,
            'ADMITTED',
            actorRole,
            { bed_id: result.bed_id },
          );
          appointmentId = preRequest.appointment_id || null;
        }
      }

      admissionService.create(
        withTenant(req, {
          appointment_id: appointmentId,
          patient_id: result.patient_id,
          bed_id: result.bed_id,
          status: 'ADMITTED',
          organization_id: result.organization_id,
          hospital_id: result.hospital_id,
        }),
      );

      // NOTE: the billing ledger is deliberately NOT created here. On
      // admission the new record simply surfaces in FA's "New Admissions
      // Awaiting Ledger Setup" queue — that IS the request to Finance to
      // open a ledger. FA creates it explicitly (POST /billing/ledger),
      // and only then can charges be approved into it.
    } catch (err) {
      logger.error('Failed to complete admission/ledger cascade on bed allocation. Rolling back bed status.', err);
      // Compensating transaction: roll back bed to AVAILABLE
      wardService.updateBedStatus(result.bed_id, 'AVAILABLE');
      wardService.updateBedRequest(result.bed_request_id, { status: 'PENDING', bed_id: null });
      // Forward to Express global error handler — sends 500 without crashing the process.
      return next(err);
    }
  }

  sendResult(res, result, 200);
}

module.exports = {
  findAllWards,
  createWard,
  updateWard,
  deleteWard,
  findAllBeds,
  findBedsByWard,
  createBed,
  updateBedStatus,
  findAllBedRequests,
  createBedRequest,
  updateBedRequest,
};
