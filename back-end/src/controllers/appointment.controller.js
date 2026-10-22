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
  const result = appointmentService.create(withTenant(req, req.body));
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
  const result = appointmentService.update(Number(req.params.id), req.body);
  sendResult(res, result, 200);
}

module.exports = { enrichAppointment, findAll, findOne, create, update };
