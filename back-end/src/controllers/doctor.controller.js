'use strict';

const doctorService = require('../services/doctor.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('👨‍⚕️ Doctors');

function findAllDoctors(req, res) {
  sendResult(res, doctorService.findAllDoctors(), 200);
}

function findDoctor(req, res) {
  sendResult(res, doctorService.findDoctorById(+req.params.id), 200);
}

function createDoctor(req, res) {
  const result = doctorService.createDoctor(req.body);
  logger.log(`✅ CREATED DOCTOR  id=${result.doctor_id}  name="${result.name}"`);
  sendResult(res, result, 201);
}

function updateDoctor(req, res) {
  sendResult(res, doctorService.updateDoctor(+req.params.id, req.body), 200);
}

function deleteDoctor(req, res) {
  sendResult(res, doctorService.deleteDoctor(+req.params.id), 200);
}

function findAllAvailabilities(req, res) {
  sendResult(res, doctorService.findAllAvailabilities(), 200);
}

function findAvailabilityByDoctor(req, res) {
  sendResult(res, doctorService.findAvailabilityByDoctor(+req.params.id), 200);
}

function createAvailability(req, res) {
  const result = doctorService.createAvailability(req.body);
  logger.log(`✅ CREATED AVAILABILITY  id=${result.availability_id}  doctor_id=${result.doctor_id}`);
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
