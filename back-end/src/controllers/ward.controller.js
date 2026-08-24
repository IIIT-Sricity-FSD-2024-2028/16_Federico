'use strict';

const wardService = require('../services/ward.service');
const preRequestService = require('../services/preRequest.service');
const admissionService = require('../services/admission.service');
const billingService = require('../services/billing.service');
const { createLogger } = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError, ValidationError } = require('../errors');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('🏨 Wards');

function findAllWards(req, res) {
  sendSuccess(res, scopeToOrg(wardService.findAllWards(), req), 200);
}

function createWard(req, res) {
  const result = wardService.createWard(withTenant(req, req.body));
  logger.log(
    `✅ CREATED WARD  id=${result.ward_id}  name="${result.ward_name}"`,
  );
  sendSuccess(res, result, 201);
}

function updateWard(req, res) {
  const existing = wardService
    .findAllWards()
    .find((w) => w.ward_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this ward'), 403);
  }

  const result = wardService.updateWard(+req.params.id, req.body);
  if (result && result.error) {
    return sendError(res, new ValidationError(result.message), 400);
  }
  sendSuccess(res, result, 200);
}

function deleteWard(req, res) {
  const existing = wardService
    .findAllWards()
    .find((w) => w.ward_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this ward'), 403);
  }

  const result = wardService.deleteWard(+req.params.id);
  if (result && result.error) {
    return sendError(res, new ValidationError(result.message), 400);
  }
  sendSuccess(res, result, 200);
}

function findAllBeds(req, res) {
  sendSuccess(res, scopeToOrg(wardService.findAllBeds(), req), 200);
}

function findBedsByWard(req, res) {
  const existing = wardService
    .findAllWards()
    .find((w) => w.ward_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this ward'), 403);
  }

  sendSuccess(res, wardService.findBedsByWard(+req.params.id), 200);
}

function createBed(req, res) {
  sendSuccess(res, wardService.createBed(withTenant(req, req.body)), 201);
}

function updateBedStatus(req, res) {
  const existing = wardService
    .findAllBeds()
    .find((b) => b.bed_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this bed'), 403);
  }

  sendSuccess(
    res,
    wardService.updateBedStatus(+req.params.id, req.body.status),
    200,
  );
}

function findAllBedRequests(req, res) {
  sendSuccess(res, scopeToOrg(wardService.findAllBedRequests(), req), 200);
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
  sendSuccess(res, result, 201);
}

function updateBedRequest(req, res) {
  const existing = wardService
    .findAllBedRequests()
    .find((r) => r.bed_request_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this bed request'), 403);
  }

  const result = wardService.updateBedRequest(+req.params.id, req.body);

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

      const admission = admissionService.create(
        withTenant(req, {
          appointment_id: appointmentId,
          patient_id: result.patient_id,
          bed_id: result.bed_id,
          status: 'ADMITTED',
          organization_id: result.organization_id,
          hospital_id: result.hospital_id,
        }),
      );

      // Auto-create OPEN billing ledger for the new admission
      if (admission && admission.admission_id) {
        const existingLedger = billingService.findLedgerByAdmission(admission.admission_id);
        if (!existingLedger) {
          billingService.createLedger({
            admission_id: admission.admission_id,
            status: 'OPEN',
            organization_id: result.organization_id,
            hospital_id: result.hospital_id,
          });
        }
      }
    } catch (err) {
      logger.error('Failed to complete admission/ledger cascade on bed allocation. Rolling back bed status.', err);
      // Compensating transaction: roll back bed to AVAILABLE
      wardService.updateBedStatus(result.bed_id, 'AVAILABLE');
      wardService.updateBedRequest(result.bed_request_id, { status: 'PENDING', bed_id: null });
      return sendError(res, err, 500);
    }
  }

  sendSuccess(res, result, 200);
}

function findAllEmergencies(req, res) {
  sendSuccess(res, scopeToOrg(wardService.findAllEmergencies(), req), 200);
}

function createEmergency(req, res) {
  const createdBy = req.session ? req.session.userId : null;
  const result = wardService.createEmergency(
    withTenant(req, req.body),
    createdBy,
  );
  logger.log(
    `✅ EMERGENCY LOGGED  id=${result.emergency_id}  type=${result.emergency_type}`,
  );
  sendSuccess(res, result, 201);
}

function updateEmergency(req, res) {
  const existing = wardService
    .findAllEmergencies()
    .find((e) => e.emergency_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this emergency record'), 403);
  }

  sendSuccess(
    res,
    wardService.updateEmergency(+req.params.id, req.body),
    200,
  );
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
  findAllEmergencies,
  createEmergency,
  updateEmergency,
};
