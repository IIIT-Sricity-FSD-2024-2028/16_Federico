'use strict';

const inventoryService = require('../services/inventory.service');
const { createLogger } = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const { ForbiddenError } = require('../errors');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');

const logger = createLogger('📦 Inventory');

function findAllItems(req, res) {
  sendSuccess(res, scopeToOrg(inventoryService.findAllItems(), req), 200);
}

function createItem(req, res) {
  const result = inventoryService.createItem(withTenant(req, req.body));
  logger.log(
    `✅ ITEM CREATED  id=${result.item_id}  name="${result.item_name}"`,
  );
  sendSuccess(res, result, 201);
}

function updateItem(req, res) {
  const existing = inventoryService
    .findAllItems()
    .find((i) => i.item_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this inventory item'), 403);
  }
  sendSuccess(res, inventoryService.updateItem(+req.params.id, req.body), 200);
}

function deleteItem(req, res) {
  const existing = inventoryService
    .findAllItems()
    .find((i) => i.item_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this inventory item'), 403);
  }
  logger.log(`🗑️  ITEM DELETED  id=${req.params.id}`);
  sendSuccess(res, inventoryService.deleteItem(+req.params.id), 200);
}

function findAllRequests(req, res) {
  sendSuccess(res, scopeToOrg(inventoryService.findAllRequests(), req), 200);
}

function createRequest(req, res) {
  const result = inventoryService.createRequest(withTenant(req, req.body));
  logger.log(
    `✅ REQUEST CREATED  id=${result.request_id}  item_id=${result.item_id}`,
  );
  sendSuccess(res, result, 201);
}

function updateRequest(req, res) {
  const existing = inventoryService
    .findAllRequests()
    .find((r) => r.request_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req)) {
    return sendError(res, new ForbiddenError('Forbidden: Access denied to this purchase request'), 403);
  }
  sendSuccess(
    res,
    inventoryService.updateRequest(+req.params.id, req.body),
    200,
  );
}

module.exports = {
  findAllItems,
  createItem,
  updateItem,
  deleteItem,
  findAllRequests,
  createRequest,
  updateRequest,
};
