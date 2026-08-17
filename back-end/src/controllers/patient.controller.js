'use strict';

const patientService = require('../services/patient.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { forbidsOtherPatient, isPatientSession } = require('../utils/patientOwnership');

const logger = createLogger('🧑‍🤝‍🧑 Patients');
const FORBIDDEN = { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 };

// List-all-patients is a staff-only view — 'Patient' is in the resource's
// coarse read gate only so findOne/findInsuranceByPatient below can serve
// a patient's OWN record; this endpoint has no single record to scope to,
// so it must deny Patient outright rather than leak every patient.
function findAll(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, patientService.findAll(), 200);
}

function findOne(req, res) {
  const patient = patientService.findOne(req.params.id);
  if (patient && forbidsOtherPatient(req, patient.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, patient, 200);
}

// Registering a new patient record is a staff (HOM/PRE) action — a
// logged-in Patient already has their one record from signup and has no
// legitimate reason to create another.
function create(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  const result = patientService.create(req.body);
  logger.log(`✅ REGISTERED  patient_id=${result.patient_id}  name="${result.name}"`);
  sendResult(res, result, 201);
}

function update(req, res) {
  const existing = patientService.findOne(req.params.id);
  if (existing && forbidsOtherPatient(req, existing.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, patientService.update(req.params.id, req.body), 200);
}

// Deleting a patient record is never a patient self-service action.
function remove(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, patientService.remove(req.params.id), 200);
}

// Same list-all-across-everyone concern as findAll above.
function findAllInsurances(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, patientService.findAllInsurances(), 200);
}

function findInsuranceByPatient(req, res) {
  const patientId = +req.params.id;
  if (forbidsOtherPatient(req, patientId)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, patientService.findInsuranceByPatient(patientId), 200);
}

function createInsurance(req, res) {
  if (forbidsOtherPatient(req, req.body.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  const result = patientService.createInsurance(req.body);
  logger.log(`✅ INSURANCE ADDED  insurance_id=${result.insurance_id}  patient_id=${result.patient_id}`);
  sendResult(res, result, 201);
}

module.exports = {
  findAll,
  findOne,
  create,
  update,
  remove,
  findAllInsurances,
  findInsuranceByPatient,
  createInsurance,
};
