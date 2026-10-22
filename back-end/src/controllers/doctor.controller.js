'use strict';

const doctorService = require('../services/doctor.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('👨‍⚕️ Doctors');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

function enrichDoctor(doc) {
  if (!doc) return doc;
  if (!doc.department && doc.specialization) {
    doc.department = doc.specialization;
  }
  return doc;
}

function findAllDoctors(req, res) {
  sendResult(res, scopeToOrg(doctorService.findAllDoctors(), req).map(enrichDoctor), 200);
}

function findDoctor(req, res) {
  const doctor = doctorService.findDoctorById(+req.params.id);
  if (doctor && !belongsToOrg(doctor, req)) return sendResult(res, null, 200);
  sendResult(res, enrichDoctor(doctor), 200);
}

function createDoctor(req, res) {
  const result = doctorService.createDoctor(withTenant(req, req.body));
  logger.log(
    `✅ CREATED DOCTOR  id=${result.doctor_id}  name="${result.name}"`,
  );
  sendResult(res, result, 201);
}

function updateDoctor(req, res) {
  const existing = doctorService.findDoctorById(+req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  sendResult(res, doctorService.updateDoctor(+req.params.id, req.body), 200);
}

function deleteDoctor(req, res) {
  const existing = doctorService.findDoctorById(+req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  sendResult(res, doctorService.deleteDoctor(+req.params.id), 200);
}

function findAllAvailabilities(req, res) {
  sendResult(res, scopeToOrg(doctorService.findAllAvailabilities(), req), 200);
}

function findAvailabilityByDoctor(req, res) {
  sendResult(
    res,
    scopeToOrg(doctorService.findAvailabilityByDoctor(+req.params.id), req),
    200,
  );
}

function createAvailability(req, res) {
  const payload = withTenant(req, req.body);
  const doctor = doctorService.findDoctorById(payload.doctor_id);
  if (doctor && !belongsToOrg(doctor, req)) return res.status(404).json({ message: 'Doctor not found in this organization', error: 'Not Found', statusCode: 404 });
  const result = doctorService.createAvailability(payload);
  logger.log(
    `✅ CREATED AVAILABILITY  id=${result.availability_id}  doctor_id=${result.doctor_id}`,
  );
  sendResult(res, result, 201);
}

function deleteAvailability(req, res) {
  const availability = doctorService.findAvailabilityById(+req.params.id);
  if (availability && !belongsToOrg(availability, req)) {
    return res.status(403).json(FORBIDDEN);
  }
  sendResult(res, doctorService.deleteAvailability(+req.params.id), 200);
}

module.exports = {
  enrichDoctor,
  findAllDoctors,
  findDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  findAllAvailabilities,
  findAvailabilityByDoctor,
  createAvailability,
  deleteAvailability,
};
