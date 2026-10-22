'use strict';

const patientService = require('../services/patient.service');
const billingService = require('../services/billing.service');
const preRequestService = require('../services/preRequest.service');
const appointmentService = require('../services/appointment.service');
const doctorService = require('../services/doctor.service');
const wardService = require('../services/ward.service');
const organizationService = require('../services/organization.service');
const { enrichDoctor } = require('./doctor.controller');
const { enrichAppointment } = require('./appointment.controller');
const { enrichBed } = require('./ward.controller');
const dataStore = require('../store/dataStore');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const {
  forbidsOtherPatient,
  isPatientSession,
  isForbiddenPatient,
} = require('../utils/patientOwnership');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('🧑‍🤝‍🧑 Patients');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

// List-all-patients is a staff-only view — patients only access their own record.
function findAll(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(patientService.findAll(), req), 200);
}

function findOne(req, res) {
  const patient = patientService.findOne(req.params.id);
  if (isForbiddenPatient(patient, req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, patient, 200);
}

// Registering a new patient record is a staff (HOM/PRE) action.
function create(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  const payload = withTenant(req, req.body);
  if (payload.user_id) {
    const user = dataStore.users.find((item) => Number(item.user_id) === Number(payload.user_id));
    if (!belongsToOrg(user, req)) return res.status(404).json({ message: 'User not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  const result = patientService.create(payload);
  logger.log(
    `✅ REGISTERED  patient_id=${result.patient_id}  name="${result.name}"`,
  );
  sendResult(res, result, 201);
}

function update(req, res) {
  const existing = patientService.findOne(req.params.id);
  if (isForbiddenPatient(existing, req)) return res.status(403).json(FORBIDDEN);
  if (req.body.user_id) {
    const user = dataStore.users.find((item) => Number(item.user_id) === Number(req.body.user_id));
    if (!belongsToOrg(user, req)) return res.status(404).json({ message: 'User not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  sendResult(res, patientService.update(req.params.id, req.body), 200);
}

// Deleting a patient record is never a patient self-service action.
function remove(req, res, next) {
  try {
    if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
    const existing = patientService.findOne(req.params.id);
    if (existing && !belongsToOrg(existing, req)) {
      return res.status(403).json(FORBIDDEN);
    }
    sendResult(res, patientService.remove(req.params.id), 200);
  } catch (err) {
    next(err);
  }
}

// Insurance list across all patients is staff-only.
function findAllInsurances(req, res) {
  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(patientService.findAllInsurances(), req), 200);
}

function findInsurance(req, res) {
  const qId = req.query.patient_id || req.query.patientId;
  const patientId = qId
    ? Number(qId)
    : req.session?.patientId
      ? Number(req.session.patientId)
      : null;

  if (patientId) {
    if (forbidsOtherPatient(req, patientId)) return res.status(403).json(FORBIDDEN);
    if (!isPatientSession(req)) {
      const target = patientService.findOne(patientId);
      if (target && !belongsToOrg(target, req)) return res.status(403).json(FORBIDDEN);
    }
    return sendResult(res, patientService.findInsuranceByPatient(patientId), 200);
  }

  if (isPatientSession(req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, scopeToOrg(patientService.findAllInsurances(), req), 200);
}

function findInsuranceByPatient(req, res) {
  const patientId = Number(req.params.id);
  if (forbidsOtherPatient(req, patientId)) return res.status(403).json(FORBIDDEN);
  if (!isPatientSession(req)) {
    const target = patientService.findOne(patientId);
    if (target && !belongsToOrg(target, req)) return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, patientService.findInsuranceByPatient(patientId), 200);
}

function createInsurance(req, res) {
  if (forbidsOtherPatient(req, req.body.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  const patient = patientService.findOne(req.body.patient_id);
  if (!belongsToOrg(patient, req)) return res.status(404).json({ message: 'Patient not found in this organization', error: 'Not Found', statusCode: 404 });
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
  const rawId = req.params.id && req.params.id !== 'undefined' && req.params.id !== 'null'
    ? req.params.id
    : req.session?.patientId;
  const patientId = Number(rawId);
  if (!patientId || forbidsOtherPatient(req, patientId)) {
    return res.status(403).json(FORBIDDEN);
  }

  const patient = patientService.findOne(patientId);
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

  const insurance = patientService.findCurrentInsurance(patientId);
  const preRequests = preRequestService.findAll((pr) => pr.patient_id === patientId);
  const appointments = appointmentService
    .findAll((a) => a.patient_id === patientId)
    .map(enrichAppointment);
  const bundles = billingService.findPatientBills(patientId);

  // Attach discharge summaries inline to avoid N+1 waterfall
  const enrichedBundles = bundles.map((b) => ({
    ...b,
    dischargeSummary: b.dischargeSummary || billingService.findDischargeSummaryByAdmission(b.admission.admission_id) || null,
  }));

  const receipts = billingService.findReceiptsByPatient(patientId);
  const doctors = scopeToOrg(doctorService.findAllDoctors(), req).map(enrichDoctor);
  const beds = scopeToOrg(wardService.findAllBeds(), req).map(enrichBed);
  const services = scopeToOrg(billingService.findAllServices(), req);
  const organization = organizationService.findById(patient.organization_id);
  const orgSpecialties = organization?.specialties && Array.isArray(organization.specialties)
    ? organization.specialties
    : [];

  const userRecord = patient.user_id
    ? dataStore.users.find((u) => u.user_id === patient.user_id)
    : null;
  const user = userRecord
    ? {
        user_id: userRecord.user_id,
        email: userRecord.email,
        name: userRecord.name,
        phone: userRecord.phone || null,
        orgName: organization?.name,
        hospitalName: organization?.name,
      }
    : {
        orgName: organization?.name,
        hospitalName: organization?.name,
      };

  const patientDischargeSummaries = dataStore.dischargeSummaries
    .filter((ds) => {
      if (Number(ds.patient_id) === patientId) return true;
      const admission = dataStore.admissions.find((a) => a.admission_id === ds.admission_id);
      return Boolean(admission && Number(admission.patient_id) === patientId);
    })
    .map((ds) => billingService.findDischargeSummaryByAdmission(ds.admission_id) || ds);

  sendResult(res, {
    patient,
    user,
    insurance,
    specialties: orgSpecialties,
    preRequests,
    appointments,
    bundles: enrichedBundles,
    dischargeSummaries: patientDischargeSummaries,
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
  findInsurance,
  findInsuranceByPatient,
  createInsurance,
  getPortalSummary,
};
