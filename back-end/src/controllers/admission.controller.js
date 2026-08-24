'use strict';

const admissionService = require('../services/admission.service');
const { createLogger } = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError } = require('../errors');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('🏥 Admissions');

function findAll(req, res) {
  const admissions = scopeToOrg(admissionService.findAll(), req);
  logger.log(`📋 LIST ALL  | total=${admissions.length} admissions`);
  sendSuccess(res, admissions, 200);
}

function findOne(req, res) {
  const { id } = req.params;
  logger.log(`🔍 GET  admission_id=${id}`);
  const admission = admissionService.findOne(+id);
  if (admission && !belongsToOrg(admission, req)) {
    return sendSuccess(res, null, 200);
  }
  sendSuccess(res, admission, 200);
}

function create(req, res) {
  const result = admissionService.create(withTenant(req, req.body));
  logger.log(
    `✅ CREATED  admission_id=${result.admission_id}  patient_id=${result.patient_id}  bed_id=${result.bed_id}`,
  );
  sendSuccess(res, result, 201);
}

function update(req, res) {
  const { id } = req.params;
  const existing = admissionService.findOne(+id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this admission record'), 403);
  }
  const result = admissionService.update(+id, req.body);
  const keys = Object.keys(req.body).join(', ');
  logger.log(`✏️  UPDATED  admission_id=${id}  fields=[${keys}]`);
  sendSuccess(res, result, 200);
}

module.exports = { findAll, findOne, create, update };
