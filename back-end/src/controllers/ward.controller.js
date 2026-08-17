'use strict';

const wardService = require('../services/ward.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('🏨 Wards');

function findAllWards(req, res) {
  sendResult(res, wardService.findAllWards(), 200);
}

function createWard(req, res) {
  const result = wardService.createWard(req.body);
  logger.log(`✅ CREATED WARD  id=${result.ward_id}  name="${result.ward_name}"`);
  sendResult(res, result, 201);
}

function findAllBeds(req, res) {
  sendResult(res, wardService.findAllBeds(), 200);
}

function findBedsByWard(req, res) {
  sendResult(res, wardService.findBedsByWard(+req.params.id), 200);
}

function createBed(req, res) {
  const result = wardService.createBed(req.body);
  logger.log(`✅ CREATED BED  id=${result.bed_id}  ward_id=${result.ward_id}  number=${result.bed_number}`);
  sendResult(res, result, 201);
}

function updateBedStatus(req, res) {
  const { bedId } = req.params;
  const result = wardService.updateBedStatus(+bedId, req.body.status);
  logger.log(`✏️  BED UPDATE  bed_id=${bedId}  status="${req.body.status}"`);
  sendResult(res, result, 200);
}

module.exports = { findAllWards, createWard, findAllBeds, findBedsByWard, createBed, updateBedStatus };
