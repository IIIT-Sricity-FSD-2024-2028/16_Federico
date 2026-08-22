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

function findAllDoctors(req, res) {
  sendResult(res, scopeToOrg(doctorService.findAllDoctors(), req), 200);
}

function findDoctor(req, res) {
  const doctor = doctorService.findDoctorById(+req.params.id);
  if (doctor && !belongsToOrg(doctor, req)) return sendResult(res, null, 200);
  sendResult(res, doctor, 200);
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
  const result = doctorService.createAvailability(withTenant(req, req.body));
  logger.log(
    `✅ CREATED AVAILABILITY  id=${result.availability_id}  doctor_id=${result.doctor_id}`,
  );
  sendResult(res, result, 201);
}

function deleteAvailability(req, res) {
  sendResult(res, doctorService.deleteAvailability(+req.params.id), 200);
}

module.exports = {
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
