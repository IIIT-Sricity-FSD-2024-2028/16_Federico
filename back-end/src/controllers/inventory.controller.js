'use strict';

const inventoryService = require('../services/inventory.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('📦 Inventory');

function findAllItems(req, res) {
  sendResult(res, inventoryService.findAllItems(), 200);
}

function createItem(req, res) {
  const result = inventoryService.createItem(req.body);
  logger.log(`✅ ITEM CREATED  id=${result.item_id}  name="${result.item_name}"`);
  sendResult(res, result, 201);
}

function updateItem(req, res) {
  sendResult(res, inventoryService.updateItem(+req.params.id, req.body), 200);
}

function findAllRequests(req, res) {
  sendResult(res, inventoryService.findAllRequests(), 200);
}

function createRequest(req, res) {
  const result = inventoryService.createRequest(req.body);
  logger.log(`✅ REQUEST CREATED  id=${result.request_id}  item_id=${result.item_id}`);
  sendResult(res, result, 201);
}

function updateRequest(req, res) {
  sendResult(res, inventoryService.updateRequest(+req.params.id, req.body), 200);
}

module.exports = { findAllItems, createItem, updateItem, findAllRequests, createRequest, updateRequest };
