'use strict';

const requestService = require('../services/request.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('📋 Appointments');

function findAll(req, res) {
  const apts = requestService.findAll();
  logger.log(`📋 LIST ALL  total=${apts.length} appointments`);
  sendResult(res, apts, 200);
}

function create(req, res) {
  const result = requestService.create(req.body);
  logger.log(
    `✅ CREATED APPOINTMENT  id=${result.appointment_id}  patient_id=${result.patient_id}  type=${result.visit_type}  status=${result.status}`,
  );
  sendResult(res, result, 201);
}

function update(req, res) {
  const { id } = req.params;
  const result = requestService.update(+id, req.body);
  const keys = Object.keys(req.body).join(', ');
  logger.log(`✏️  UPDATED APPOINTMENT  id=${id}  status=${req.body.status || '?'}  fields=[${keys}]`);
  sendResult(res, result, 200);
}

module.exports = { findAll, create, update };
