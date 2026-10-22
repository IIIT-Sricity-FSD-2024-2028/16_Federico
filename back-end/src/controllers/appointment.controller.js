'use strict';

const appointmentService = require('../services/appointment.service');
const dataStore = require('../store/dataStore');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');
const { forbidsOtherPatient } = require('../utils/patientOwnership');

const logger = createLogger('📅 Appointments');
const FORBIDDEN = {
  message: 'Forbidden: Access denied to this appointment',
  error: 'Forbidden',
  statusCode: 403,
};

function enrichAppointment(apt) {
  if (!apt) return apt;
  const docId = apt.doctor_id || (apt.availability ? apt.availability.doctor_id : null);
  if (docId) {
    const doc = dataStore.doctors.find((d) => d.doctor_id === docId);
    if (doc) {
      if (!apt.doctor_name) apt.doctor_name = doc.name;
      if (!apt.department) apt.department = doc.specialization;
    }
  }
  return apt;
}

function findAll(req, res) {
  const all = scopeToOrg(appointmentService.findAll(), req).map(enrichAppointment);
  let visible =
    req.session && req.session.role === 'Patient'
      ? all.filter((a) => a.patient_id === req.session.patientId)
      : all;
  const qPatientId = req.query.patient_id || req.query.patientId;
  if (qPatientId) {
    const targetPid = Number(qPatientId);
    if (forbidsOtherPatient(req, targetPid)) {
      return res.status(403).json(FORBIDDEN);
    }
    visible = visible.filter((a) => a.patient_id === targetPid);
  }
  sendResult(res, visible, 200);
}

function findOne(req, res) {
  const apt = appointmentService.findOne(Number(req.params.id));
  if (!apt || !belongsToOrg(apt, req)) {
    return sendResult(res, null, 200);
  }
  if (forbidsOtherPatient(req, apt.patient_id)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, enrichAppointment(apt), 200);
}

function create(req, res) {
  const payload = withTenant(req, req.body);
  const patient = dataStore.patients.find((p) => Number(p.patient_id) === Number(payload.patient_id));
  if (patient && !belongsToOrg(patient, req)) return res.status(404).json({ message: 'Patient not found in this organization', error: 'Not Found', statusCode: 404 });
  if (payload.doctor_id) {
    const doctor = dataStore.doctors.find((d) => Number(d.doctor_id) === Number(payload.doctor_id));
    if (doctor && !belongsToOrg(doctor, req)) return res.status(404).json({ message: 'Doctor not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  if (payload.availability_id) {
    const availability = dataStore.doctorAvailabilities.find((a) => Number(a.availability_id) === Number(payload.availability_id));
    if (availability && (!belongsToOrg(availability, req) || (payload.doctor_id && Number(availability.doctor_id) !== Number(payload.doctor_id)))) return res.status(404).json({ message: 'Availability not found for this doctor in this organization', error: 'Not Found', statusCode: 404 });
  }
  const result = appointmentService.create(payload);
  logger.log(
    `✅ CREATED APPOINTMENT  id=${result.appointment_id}  patient=${result.patient_id}`,
  );
  sendResult(res, result, 201);
}

function update(req, res) {
  const existing = appointmentService.findOne(Number(req.params.id));
  if (existing && !belongsToOrg(existing, req)) {
    return res.status(403).json(FORBIDDEN);
  }
  const patientId = req.body.patient_id ?? existing?.patient_id;
  const patient = dataStore.patients.find((item) => Number(item.patient_id) === Number(patientId));
  if (patientId != null && !belongsToOrg(patient, req)) return res.status(404).json({ message: 'Patient not found in this organization', error: 'Not Found', statusCode: 404 });
  const doctorId = req.body.doctor_id ?? existing?.doctor_id;
  if (doctorId) {
    const doctor = dataStore.doctors.find((item) => Number(item.doctor_id) === Number(doctorId));
    if (!belongsToOrg(doctor, req)) return res.status(404).json({ message: 'Doctor not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  const availabilityId = req.body.availability_id ?? existing?.availability_id;
  if (availabilityId) {
    const availability = dataStore.doctorAvailabilities.find((item) => Number(item.availability_id) === Number(availabilityId));
    if (!belongsToOrg(availability, req) || (doctorId && Number(availability.doctor_id) !== Number(doctorId))) return res.status(404).json({ message: 'Availability not found for this doctor in this organization', error: 'Not Found', statusCode: 404 });
  }
  const result = appointmentService.update(Number(req.params.id), req.body);
  sendResult(res, result, 200);
}

module.exports = { enrichAppointment, findAll, findOne, create, update };
