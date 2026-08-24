'use strict';

const appointmentService = require('../services/appointment.service');
const { createLogger } = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError } = require('../errors');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('📅 Appointments');

function findAll(req, res) {
  sendSuccess(res, scopeToOrg(appointmentService.findAll(), req), 200);
}

function create(req, res) {
  try {
    const result = appointmentService.create(withTenant(req, req.body));
    logger.log(
      `✅ CREATED APPOINTMENT  id=${result.appointment_id}  patient=${result.patient_id}`,
    );
    sendSuccess(res, result, 201);
  } catch (err) {
    sendError(res, err, err.statusCode || 400);
  }
}

function update(req, res) {
  const existing = appointmentService.findOne(Number(req.params.id));
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this appointment'), 403);
  }
  const result = appointmentService.update(Number(req.params.id), req.body);
  sendSuccess(res, result, 200);
}

module.exports = { findAll, create, update };
