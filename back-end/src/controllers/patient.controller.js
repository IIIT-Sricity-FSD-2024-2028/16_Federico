'use strict';

const patientService = require('../services/patient.service');
const billingService = require('../services/billing.service');
const preRequestService = require('../services/preRequest.service');
const appointmentService = require('../services/appointment.service');
const doctorService = require('../services/doctor.service');
const wardService = require('../services/ward.service');
const { createLogger } = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError, NotFoundError } = require('../errors');
const {
  forbidsOtherPatient,
  isPatientSession,
} = require('../utils/patientOwnership');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('🧑‍🤝‍🧑 Patients');

function findAll(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, scopeToOrg(patientService.findAll(), req), 200);
}

function findOne(req, res) {
  const patient = patientService.findOne(req.params.id);
  if (
    patient &&
    (forbidsOtherPatient(req, patient.patient_id) ||
      !belongsToOrg(patient, req))
  ) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, patient, 200);
}

function create(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  const result = patientService.create(withTenant(req, req.body));
  logger.log(
    `✅ REGISTERED  patient_id=${result.patient_id}  name="${result.name}"`,
  );
  sendSuccess(res, result, 201);
}

function update(req, res) {
  const existing = patientService.findOne(req.params.id);
  if (
    existing &&
    (forbidsOtherPatient(req, existing.patient_id) ||
      !belongsToOrg(existing, req))
  ) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, patientService.update(req.params.id, req.body), 200);
}

function remove(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  const existing = patientService.findOne(req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, patientService.remove(req.params.id), 200);
}

function findAllInsurances(req, res) {
  if (isPatientSession(req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  sendSuccess(res, scopeToOrg(patientService.findAllInsurances(), req), 200);
}

function findInsuranceByPatient(req, res) {
  const patientId = +req.params.id;
  if (forbidsOtherPatient(req, patientId)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  if (!isPatientSession(req)) {
    const target = patientService.findOne(String(patientId));
    if (target && !belongsToOrg(target, req)) {
      return sendError(res, new ForbiddenError('Forbidden resource'), 403);
    }
  }
  sendSuccess(res, patientService.findInsuranceByPatient(patientId), 200);
}

function createInsurance(req, res) {
  if (forbidsOtherPatient(req, req.body.patient_id)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }
  const result = patientService.createInsurance(withTenant(req, req.body));
  logger.log(
    `✅ INSURANCE ADDED  insurance_id=${result.insurance_id}  patient_id=${result.patient_id}`,
  );
  sendSuccess(res, result, 201);
}

/**
 * Composite Patient Portal Endpoint:
 * Consolidates patient profile, insurance, pre-requests, appointments, bills,
 * receipts, and catalog lookups into a single fast roundtrip.
 */
function getPortalSummary(req, res) {
  const patientId = Number(req.params.id || (req.session && req.session.patientId));
  if (!patientId || (isPatientSession(req) && forbidsOtherPatient(req, patientId))) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }

  const patient = patientService.findOne(String(patientId));
  if (!patient) {
    return sendError(res, new NotFoundError(`Patient #${patientId} not found`), 404);
  }
  if (!belongsToOrg(patient, req)) {
    return sendError(res, new ForbiddenError('Forbidden resource'), 403);
  }

  const insurances = patientService.findInsuranceByPatient(patientId);
  // createInsurance() appends a new record rather than updating in place, so
  // a patient can have several; the most recently created one (highest
  // insurance_id) is the current policy — e.g. after re-saving the
  // Insurance section with a newly uploaded card scan.
  const insurance =
    insurances && insurances.length
      ? insurances.reduce((latest, ins) =>
          ins.insurance_id > latest.insurance_id ? ins : latest,
        )
      : null;

  const preRequests = preRequestService.findAll((pr) => pr.patient_id === patientId);
  const appointments = appointmentService.findAll((a) => a.patient_id === patientId);
  const bundles = billingService.findPatientBills(patientId);

  // Attach discharge summaries inline to avoid N+1 waterfall
  const enrichedBundles = bundles.map((b) => {
    const dischargeSummary = billingService.findDischargeSummaryByAdmission(b.admission.admission_id);
    return { ...b, dischargeSummary };
  });

  const receipts = billingService.findReceiptsByPatient(patientId);
  const doctors = scopeToOrg(doctorService.findAllDoctors(), req);
  const beds = scopeToOrg(wardService.findAllBeds(), req);
  const services = scopeToOrg(billingService.findAllServices(), req);

  sendSuccess(res, {
    patient,
    insurance,
    preRequests,
    appointments,
    bundles: enrichedBundles,
    receipts,
    doctors,
    beds,
    services,
  }, 200);
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
  getPortalSummary,
};
