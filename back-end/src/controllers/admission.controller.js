'use strict';

const admissionService = require('../services/admission.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('🏥 Admissions');
const FORBIDDEN = { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 };

function findAll(req, res) {
  const admissions = scopeToOrg(admissionService.findAll(), req);
  logger.log(`📋 LIST ALL  | total=${admissions.length} admissions`);
  sendResult(res, admissions, 200);
}

function findOne(req, res) {
  const { id } = req.params;
  logger.log(`🔍 GET  admission_id=${id}`);
  const admission = admissionService.findOne(+id);
  if (admission && !belongsToOrg(admission, req)) return sendResult(res, null, 200);
  sendResult(res, admission, 200);
}

function create(req, res) {
  const result = admissionService.create(withTenant(req, req.body));
  logger.log(`✅ CREATED  admission_id=${result.admission_id}  patient_id=${result.patient_id}  bed_id=${result.bed_id}`);
  sendResult(res, result, 201);
}

function update(req, res) {
  const { id } = req.params;
  const existing = admissionService.findOne(+id);
  if (existing && !belongsToOrg(existing, req)) return res.status(403).json(FORBIDDEN);
  const result = admissionService.update(+id, req.body);
  const keys = Object.keys(req.body).join(', ');
  logger.log(`✏️  UPDATED  admission_id=${id}  fields=[${keys}]`);
  sendResult(res, result, 200);
}

module.exports = { findAll, findOne, create, update };
