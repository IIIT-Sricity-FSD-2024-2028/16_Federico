'use strict';

const wardService = require('../services/ward.service');
const preRequestService = require('../services/preRequest.service');
const admissionService = require('../services/admission.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('🏨 Wards');

function findAllWards(req, res) {
  sendResult(res, wardService.findAllWards(), 200);
}

function createWard(req, res) {
  const result = wardService.createWard(req.body);
  logger.log(`✅ CREATED WARD  id=${result.ward_id}  name="${result.ward_name}"`);
  sendResult(res, result, 201);
}

function findAllBeds(req, res) {
  sendResult(res, wardService.findAllBeds(), 200);
}

function findBedsByWard(req, res) {
  sendResult(res, wardService.findBedsByWard(+req.params.id), 200);
}

function createBed(req, res) {
  const result = wardService.createBed(req.body);
  logger.log(`✅ CREATED BED  id=${result.bed_id}  ward_id=${result.ward_id}  number=${result.bed_number}`);
  sendResult(res, result, 201);
}

function updateBedStatus(req, res) {
  const { bedId } = req.params;
  const result = wardService.updateBedStatus(+bedId, req.body.status);
  logger.log(`✏️  BED UPDATE  bed_id=${bedId}  status="${req.body.status}"`);
  sendResult(res, result, 200);
}

function findAllBedRequests(req, res) {
  sendResult(res, wardService.findAllBedRequests(), 200);
}

function createBedRequest(req, res) {
  const requestedBy = req.session ? req.session.userId : null;
  sendResult(res, wardService.createBedRequest(req.body, requestedBy), 201);
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
function updateBedRequest(req, res) {
  const result = wardService.updateBedRequest(+req.params.id, req.body);

  if (result && result.status === 'ALLOCATED') {
    let appointmentId = null;

    if (result.pre_request_id) {
      const preRequest = preRequestService.findOne(result.pre_request_id);
      const actorRole = req.session ? req.session.role : 'HOM';
      if (preRequest && preRequestService.canTransition(preRequest.status, 'ADMITTED', actorRole)) {
        preRequestService.transition(result.pre_request_id, 'ADMITTED', actorRole, { bed_id: result.bed_id });
        appointmentId = preRequest.appointment_id || null;
      }
    }

    admissionService.create({
      appointment_id: appointmentId,
      patient_id: result.patient_id,
      bed_id: result.bed_id,
      status: 'ADMITTED',
    });
  }

  sendResult(res, result, 200);
}

function findAllEmergencies(req, res) {
  sendResult(res, wardService.findAllEmergencies(), 200);
}

function createEmergency(req, res) {
  const createdBy = req.session ? req.session.userId : null;
  sendResult(res, wardService.createEmergency(req.body, createdBy), 201);
}

function updateEmergency(req, res) {
  sendResult(res, wardService.updateEmergency(+req.params.id, req.body), 200);
}

module.exports = {
  findAllWards,
  createWard,
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
