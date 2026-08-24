'use strict';

const doctorService = require('../services/doctor.service');
const { createLogger } = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError } = require('../errors');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('👨‍⚕️ Doctors');

function findAllDoctors(req, res) {
  sendSuccess(res, scopeToOrg(doctorService.findAllDoctors(), req), 200);
}

function findDoctor(req, res) {
  const doctor = doctorService.findDoctorById(+req.params.id);
  if (doctor && !belongsToOrg(doctor, req)) return sendSuccess(res, null, 200);
  sendSuccess(res, doctor, 200);
}

function createDoctor(req, res) {
  const result = doctorService.createDoctor(withTenant(req, req.body));
  logger.log(
    `✅ CREATED DOCTOR  id=${result.doctor_id}  name="${result.name}"`,
  );
  sendSuccess(res, result, 201);
}

function updateDoctor(req, res) {
  const existing = doctorService.findDoctorById(+req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this doctor'), 403);
  }
  sendSuccess(res, doctorService.updateDoctor(+req.params.id, req.body), 200);
}

function deleteDoctor(req, res) {
  const existing = doctorService.findDoctorById(+req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this doctor'), 403);
  }
  sendSuccess(res, doctorService.deleteDoctor(+req.params.id), 200);
}

function findAllAvailabilities(req, res) {
  sendSuccess(res, scopeToOrg(doctorService.findAllAvailabilities(), req), 200);
}

function findAvailabilityByDoctor(req, res) {
  sendSuccess(
    res,
    scopeToOrg(doctorService.findAvailabilityByDoctor(+req.params.id), req),
    200,
  );
}

function createAvailability(req, res) {
  try {
    const result = doctorService.createAvailability(withTenant(req, req.body));
    logger.log(
      `✅ CREATED AVAILABILITY  id=${result.availability_id}  doctor_id=${result.doctor_id}`,
    );
    sendSuccess(res, result, 201);
  } catch (err) {
    sendError(res, err, err.statusCode || 400);
  }
}

function deleteAvailability(req, res) {
  sendSuccess(res, doctorService.deleteAvailability(+req.params.id), 200);
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
