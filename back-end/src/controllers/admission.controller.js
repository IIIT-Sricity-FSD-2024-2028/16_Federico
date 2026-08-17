'use strict';

const admissionService = require('../services/admission.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('🏥 Admissions');

function findAll(req, res) {
  const admissions = admissionService.findAll();
  logger.log(`📋 LIST ALL  | total=${admissions.length} admissions`);
  sendResult(res, admissions, 200);
}

function findOne(req, res) {
  const { id } = req.params;
  logger.log(`🔍 GET  admission_id=${id}`);
  sendResult(res, admissionService.findOne(+id), 200);
}

function create(req, res) {
  const result = admissionService.create(req.body);
  logger.log(`✅ CREATED  admission_id=${result.admission_id}  patient_id=${result.patient_id}  bed_id=${result.bed_id}`);
  sendResult(res, result, 201);
}

function update(req, res) {
  const { id } = req.params;
  const result = admissionService.update(+id, req.body);
  const keys = Object.keys(req.body).join(', ');
  logger.log(`✏️  UPDATED  admission_id=${id}  fields=[${keys}]`);
  sendResult(res, result, 200);
}

module.exports = { findAll, findOne, create, update };
