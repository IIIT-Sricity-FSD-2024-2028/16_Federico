'use strict';

const admissionService = require('../services/admission.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');
const dataStore = require('../store/dataStore');

const logger = createLogger('🏥 Admissions');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

function findAll(req, res) {
  const admissions = scopeToOrg(admissionService.findAll(), req);
  logger.log(`📋 LIST ALL  | total=${admissions.length} admissions`);
  sendResult(res, admissions, 200);
}

function findOne(req, res) {
  const { id } = req.params;
  logger.log(`🔍 GET  admission_id=${id}`);
  const admission = admissionService.findOne(+id);
  if (admission && !belongsToOrg(admission, req))
    return sendResult(res, null, 200);
  sendResult(res, admission, 200);
}

function create(req, res) {
  const payload = withTenant(req, req.body);
  const patient = dataStore.patients.find((p) => Number(p.patient_id) === Number(payload.patient_id));
  if (!belongsToOrg(patient, req)) return res.status(404).json({ message: 'Patient not found in this organization', error: 'Not Found', statusCode: 404 });
  if (payload.appointment_id) {
    const appointment = dataStore.appointments.find((a) => Number(a.appointment_id) === Number(payload.appointment_id));
    if (!belongsToOrg(appointment, req) || Number(appointment.patient_id) !== Number(payload.patient_id)) return res.status(404).json({ message: 'Appointment not found for this patient in this organization', error: 'Not Found', statusCode: 404 });
  }
  if (payload.bed_id) {
    const bed = dataStore.beds.find((b) => Number(b.bed_id) === Number(payload.bed_id));
    if (!belongsToOrg(bed, req)) return res.status(404).json({ message: 'Bed not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  const result = admissionService.create(payload);
  logger.log(
    `✅ CREATED  admission_id=${result.admission_id}  patient_id=${result.patient_id}  bed_id=${result.bed_id}`,
  );
  sendResult(res, result, 201);
}

function update(req, res) {
  const { id } = req.params;
  const existing = admissionService.findOne(+id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  const patientId = req.body.patient_id ?? existing?.patient_id;
  const patient = dataStore.patients.find((p) => Number(p.patient_id) === Number(patientId));
  if (patientId != null && !belongsToOrg(patient, req)) return res.status(404).json({ message: 'Patient not found in this organization', error: 'Not Found', statusCode: 404 });
  const appointmentId = req.body.appointment_id ?? existing?.appointment_id;
  if (appointmentId) {
    const appointment = dataStore.appointments.find((a) => Number(a.appointment_id) === Number(appointmentId));
    if (!belongsToOrg(appointment, req) || Number(appointment.patient_id) !== Number(patientId)) return res.status(404).json({ message: 'Appointment not found for this patient in this organization', error: 'Not Found', statusCode: 404 });
  }
  const bedId = req.body.bed_id ?? existing?.bed_id;
  if (bedId) {
    const bed = dataStore.beds.find((b) => Number(b.bed_id) === Number(bedId));
    if (!belongsToOrg(bed, req)) return res.status(404).json({ message: 'Bed not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  const result = admissionService.update(+id, req.body);
  const keys = Object.keys(req.body).join(', ');
  logger.log(`✏️  UPDATED  admission_id=${id}  fields=[${keys}]`);
  sendResult(res, result, 200);
}

module.exports = { findAll, findOne, create, update };
