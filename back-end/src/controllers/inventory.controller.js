'use strict';

const inventoryService = require('../services/inventory.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');
const { withTenant, scopeToOrg, belongsToOrg } = require('../utils/tenant');
const dataStore = require('../store/dataStore');

const logger = createLogger('📦 Inventory');
const FORBIDDEN = {
  message: 'Forbidden resource',
  error: 'Forbidden',
  statusCode: 403,
};

function findAllItems(req, res) {
  sendResult(res, scopeToOrg(inventoryService.findAllItems(), req), 200);
}

function createItem(req, res) {
  const payload = withTenant(req, req.body);
  if (payload.service_id) {
    const service = dataStore.services.find((record) => Number(record.service_id) === Number(payload.service_id));
    if (!belongsToOrg(service, req)) return res.status(404).json({ message: 'Service not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  const result = inventoryService.createItem(payload);
  logger.log(
    `✅ ITEM CREATED  id=${result.item_id}  name="${result.item_name}"`,
  );
  sendResult(res, result, 201);
}

function updateItem(req, res) {
  const existing = inventoryService
    .findAllItems()
    .find((i) => i.item_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  if (req.body && Object.hasOwn(req.body, 'service_id') && req.body.service_id != null) {
    const service = dataStore.services.find((record) => Number(record.service_id) === Number(req.body.service_id));
    if (!belongsToOrg(service, req)) return res.status(404).json({ message: 'Service not found in this organization', error: 'Not Found', statusCode: 404 });
  }
  sendResult(res, inventoryService.updateItem(+req.params.id, req.body), 200);
}

function deleteItem(req, res) {
  const existing = inventoryService
    .findAllItems()
    .find((i) => i.item_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  logger.log(`🗑️  ITEM DELETED  id=${req.params.id}`);
  sendResult(res, inventoryService.deleteItem(+req.params.id), 200);
}

function findAllRequests(req, res) {
  sendResult(res, scopeToOrg(inventoryService.findAllRequests(), req), 200);
}

function createRequest(req, res) {
  const payload = withTenant(req, req.body);
  const item = inventoryService.findAllItems().find((record) => Number(record.item_id) === Number(payload.item_id));
  if (!belongsToOrg(item, req)) return res.status(404).json({ message: 'Inventory item not found in this organization', error: 'Not Found', statusCode: 404 });
  const requester = dataStore.users.find((record) => Number(record.user_id) === Number(payload.requested_by));
  if (!belongsToOrg(requester, req)) return res.status(404).json({ message: 'Requester not found in this organization', error: 'Not Found', statusCode: 404 });
  const result = inventoryService.createRequest(payload);
  logger.log(
    `✅ REQUEST CREATED  id=${result.request_id}  item_id=${result.item_id}`,
  );
  sendResult(res, result, 201);
}

function updateRequest(req, res) {
  const existing = inventoryService
    .findAllRequests()
    .find((r) => r.request_id === +req.params.id);
  if (existing && !belongsToOrg(existing, req))
    return res.status(403).json(FORBIDDEN);
  if (req.body && Object.hasOwn(req.body, 'quantity_requested') && (!Number.isInteger(req.body.quantity_requested) || req.body.quantity_requested <= 0)) {
    return res.status(400).json({ message: 'quantity_requested must be a positive integer', error: 'Bad Request', statusCode: 400 });
  }
  sendResult(
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
