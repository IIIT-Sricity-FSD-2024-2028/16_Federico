'use strict';

const requestService = require('../services/request.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('📋 Appointments');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

function findAll(req, res) {
  const apts = scopeToOrg(requestService.findAll(), req);
  logger.log(`📋 LIST ALL  total=${apts.length} appointments`);
  sendResult(res, apts, 200);
}

function create(req, res) {
  const result = requestService.create(withTenant(req, req.body));
  logger.log(
    `✅ CREATED APPOINTMENT  id=${result.appointment_id}  patient_id=${result.patient_id}  type=${result.visit_type}  status=${result.status}`,
  );
  sendResult(res, result, 201);
}

function update(req, res) {
  const { id } = req.params;
  const existing = requestService.findOne(+id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  const result = requestService.update(+id, req.body);
  const keys = Object.keys(req.body).join(', ');
  logger.log(
    `✏️  UPDATED APPOINTMENT  id=${id}  status=${req.body.status || '?'}  fields=[${keys}]`,
  );
  sendResult(res, result, 200);
}

module.exports = { findAll, create, update };
