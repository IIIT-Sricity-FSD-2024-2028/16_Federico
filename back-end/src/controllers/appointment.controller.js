'use strict';

const appointmentService = require('../services/appointment.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('📅 Appointments');
const FORBIDDEN = {
  message: 'Forbidden: Access denied to this appointment',
  error: 'Forbidden',
  statusCode: 403,
};

function findAll(req, res) {
  sendResult(res, scopeToOrg(appointmentService.findAll(), req), 200);
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

module.exports = { findAll, create, update };
