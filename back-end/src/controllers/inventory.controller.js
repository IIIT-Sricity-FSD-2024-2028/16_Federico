'use strict';

const inventoryService = require('../services/inventory.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('📦 Inventory');
const FORBIDDEN = { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 };

function findAllItems(req, res) {
  sendResult(res, scopeToOrg(inventoryService.findAllItems(), req), 200);
}

function createItem(req, res) {
  const result = inventoryService.createItem(withTenant(req, req.body));
  logger.log(`✅ ITEM CREATED  id=${result.item_id}  name="${result.item_name}"`);
  sendResult(res, result, 201);
}

function updateItem(req, res) {
  const existing = inventoryService.findAllItems().find((i) => i.item_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, inventoryService.updateItem(+req.params.id, req.body), 200);
}

function findAllRequests(req, res) {
  sendResult(res, scopeToOrg(inventoryService.findAllRequests(), req), 200);
}

function createRequest(req, res) {
  const result = inventoryService.createRequest(withTenant(req, req.body));
  logger.log(`✅ REQUEST CREATED  id=${result.request_id}  item_id=${result.item_id}`);
  sendResult(res, result, 201);
}

function updateRequest(req, res) {
  const existing = inventoryService.findAllRequests().find((r) => r.request_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) return res.status(403).json(FORBIDDEN);
  sendResult(res, inventoryService.updateRequest(+req.params.id, req.body), 200);
}

module.exports = { findAllItems, createItem, updateItem, findAllRequests, createRequest, updateRequest };
