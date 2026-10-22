'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');

const ITEM_UPDATE_FIELDS = new Set([
  'item_name',
  'category',
  'stock_quantity',
  'reorder_level',
  'service_id',
]);
const REQUEST_UPDATE_FIELDS = new Set([
  'status',
  'quantity_requested',
  'invoice_url',
]);

function assertAllowedFields(patch, allowedFields) {
  const forbidden = Object.keys(patch || {}).filter((field) => !allowedFields.has(field));
  if (forbidden.length > 0) {
    const err = new Error(`Fields cannot be updated: ${forbidden.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
}

// INVENTORY_ITEM
function findAllItems() {
  return dataStore.inventoryItems;
}

function createItem(item) {
  const newItem = {
    item_id:
      maxId(dataStore.inventoryItems, 'item_id', 1) + 1,
    item_name: item.item_name,
    category: item.category || 'General',
    stock_quantity: Number(item.stock_quantity) || 0,
    reorder_level: Number(item.reorder_level) || 10,
    service_id: item.service_id ? Number(item.service_id) : null,
    organization_id: item.organization_id ? Number(item.organization_id) : null,
    hospital_id: item.hospital_id ? Number(item.hospital_id) : null,
  };
  dataStore.inventoryItems.push(newItem);
  return newItem;
}

function updateItem(item_id, patch) {
  assertAllowedFields(patch, ITEM_UPDATE_FIELDS);
  const numId = Number(item_id);
  const item = dataStore.inventoryItems.find((i) => Number(i.item_id) === numId);
  if (!item) return null;
  const safePatch = { ...patch };
  if (Object.hasOwn(safePatch, 'service_id')) {
    safePatch.service_id = safePatch.service_id == null ? null : Number(safePatch.service_id);
  }
  Object.assign(item, safePatch);
  return item;
}

/** Admin-only catalog removal (see inventoryCatalog in middleware/actorAccess.js). */
function deleteItem(item_id) {
  const numId = Number(item_id);
  const item = dataStore.inventoryItems.find((i) => Number(i.item_id) === numId);
  if (!item) return null;
  dataStore.inventoryItems = dataStore.inventoryItems.filter(
    (i) => Number(i.item_id) !== numId,
  );
  return { deleted: true, item_id: numId };
}

// PURCHASE_REQUEST
function findAllRequests() {
  return dataStore.purchaseRequests;
}

function createRequest(request) {
  const orgId = request.organization_id ? Number(request.organization_id) : null;
  const fallbackUser = orgId ? (dataStore.users.find((u) => u.organization_id === orgId)?.user_id || 101) : 101;
  const requestedBy = request.requested_by ? Number(request.requested_by) : fallbackUser;

  const newReq = {
    request_id:
      maxId(dataStore.purchaseRequests, 'request_id', 1) + 1,
    item_id: Number(request.item_id),
    quantity: Number(request.quantity || request.quantity_requested) || 1,
    quantity_requested: Number(request.quantity_requested || request.quantity) || 1,
    status: request.status || 'PENDING',
    requested_by: requestedBy,
    supplier: request.supplier || null,
    priority: request.priority || 'normal',
    notes: request.notes || null,
    requested_at: new Date().toISOString(),
    organization_id: orgId,
    hospital_id: request.hospital_id ? Number(request.hospital_id) : null,
    // Set when the requester attaches a supplier invoice/quote via
    // POST /uploads/inventory (front-end/HOM/inventory.js's Restock modal).
    invoice_url: request.invoice_url || null,
  };
  dataStore.purchaseRequests.push(newReq);
  return newReq;
}

function updateRequest(request_id, patch) {
  assertAllowedFields(patch, REQUEST_UPDATE_FIELDS);
  const numId = Number(request_id);
  const req = dataStore.purchaseRequests.find(
    (r) => Number(r.request_id) === numId,
  );
  if (!req) return null;
  const safePatch = { ...patch };
  if (Object.hasOwn(safePatch, 'quantity_requested')) {
    const quantity = Number(safePatch.quantity_requested);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      const err = new Error('quantity_requested must be a positive integer');
      err.statusCode = 400;
      throw err;
    }
    safePatch.quantity_requested = quantity;
    safePatch.quantity = quantity;
  }
  Object.assign(req, safePatch);
  return req;
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
