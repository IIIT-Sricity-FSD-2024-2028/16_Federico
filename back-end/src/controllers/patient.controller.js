'use strict';

const patientService = require('../services/patient.service');
const billingService = require('../services/billing.service');
const preRequestService = require('../services/preRequest.service');
const appointmentService = require('../services/appointment.service');
const doctorService = require('../services/doctor.service');
const wardService = require('../services/ward.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const {
  forbidsOtherPatient,
  isPatientSession,
} = require('../utils/patientOwnership');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('🧑‍🤝‍🧑 Patients');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

// List-all-patients is a staff-only view — 'Patient' is in the resource's
// coarse read gate only so findOne/findInsuranceByPatient below can serve
// a patient's OWN record; this endpoint has no single record to scope to,
// so it must deny Patient outright rather than leak every patient.
function findAll(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(patientService.findAll(), req), 200);
}

function findOne(req, res) {
  const patient = patientService.findOne(req.params.id);
  if (
    patient &&
    (forbidsOtherPatient(req, patient.patient_id) ||
      !belongsToOrg(patient, req))
  ) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, patient, 200);
}

// Registering a new patient record is a staff (HOM/PRE) action — a
// logged-in Patient already has their one record from signup and has no
// legitimate reason to create another.
function create(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  const result = patientService.create(withTenant(req, req.body));
  logger.log(
    `✅ REGISTERED  patient_id=${result.patient_id}  name="${result.name}"`,
  );
  sendResult(res, result, 201);
}

function update(req, res) {
  const existing = patientService.findOne(req.params.id);
  if (
    existing &&
    (forbidsOtherPatient(req, existing.patient_id) ||
      !belongsToOrg(existing, req))
  ) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, patientService.update(req.params.id, req.body), 200);
}

// Deleting a patient record is never a patient self-service action.
function remove(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  const existing = patientService.findOne(req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  sendResult(res, patientService.remove(req.params.id), 200);
}

// Same list-all-across-everyone concern as findAll above.
function findAllInsurances(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(patientService.findAllInsurances(), req), 200);
}

// Staff callers aren't ownership-restricted to one patient (they see
// across patients within their own org), so unlike the Patient session
// path (already checked by forbidsOtherPatient), a cross-org leak here
// would come from a staff session simply guessing another org's
// patientId. Check the target patient's own organization_id too.
function findInsuranceByPatient(req, res) {
  const patientId = +req.params.id;
  if (forbidsOtherPatient(req, patientId)) {
    return res.status(403).json(FORBIDDEN);
  }
  if (!isPatientSession(req)) {
    const target = patientService.findOne(String(patientId));
    if (target && !belongsToOrg(target, req))
      return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, patientService.findInsuranceByPatient(patientId), 200);
}

function createInsurance(req, res) {
  if (forbidsOtherPatient(req, req.body.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  const result = patientService.createInsurance(withTenant(req, req.body));
  logger.log(
    `✅ INSURANCE ADDED  insurance_id=${result.insurance_id}  patient_id=${result.patient_id}`,
  );
  sendResult(res, result, 201);
}

/**
 * Composite Patient Portal Endpoint:
 * Consolidates patient profile, insurance, pre-requests, appointments, bills,
 * receipts, and catalog lookups into a single fast roundtrip.
 */
function getPortalSummary(req, res) {
  const patientId = Number(req.params.id || (req.session && req.session.patientId));
  if (!patientId || (isPatientSession(req) && forbidsOtherPatient(req, patientId))) {
    return res.status(403).json(FORBIDDEN);
  }

  const patient = patientService.findOne(String(patientId));
  if (!patient) {
    return res.status(404).json({
      message: `Patient #${patientId} not found`,
      error: 'Not Found',
      statusCode: 404,
    });
  }
  if (!belongsToOrg(patient, req)) {
    return res.status(403).json(FORBIDDEN);
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

  sendResult(res, {
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
