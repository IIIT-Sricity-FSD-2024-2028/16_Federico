'use strict';

const patientService = require('../services/patient.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('🧑‍🤝‍🧑 Patients');

function findAll(req, res) {
  sendResult(res, patientService.findAll(), 200);
}

function findOne(req, res) {
  sendResult(res, patientService.findOne(req.params.id), 200);
}

function create(req, res) {
  const result = patientService.create(req.body);
  logger.log(`✅ REGISTERED  patient_id=${result.patient_id}  name="${result.name}"`);
  sendResult(res, result, 201);
}

function update(req, res) {
  sendResult(res, patientService.update(req.params.id, req.body), 200);
}

function remove(req, res) {
  sendResult(res, patientService.remove(req.params.id), 200);
}

function findAllInsurances(req, res) {
  sendResult(res, patientService.findAllInsurances(), 200);
}

function findInsuranceByPatient(req, res) {
  sendResult(res, patientService.findInsuranceByPatient(+req.params.id), 200);
}

function createInsurance(req, res) {
  const result = patientService.createInsurance(req.body);
  logger.log(`✅ INSURANCE ADDED  insurance_id=${result.insurance_id}  patient_id=${result.patient_id}`);
  sendResult(res, result, 201);
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
};
