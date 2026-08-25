'use strict';

const dataStore = require('../store/dataStore');

// INVENTORY_ITEM
function findAllItems() {
  return dataStore.inventoryItems;
}

function createItem(item) {
  const newItem = {
    item_id:
      dataStore.inventoryItems.length > 0
        ? Math.max(...dataStore.inventoryItems.map((i) => i.item_id)) + 1
        : 10,
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
  const item = dataStore.inventoryItems.find((i) => i.item_id === item_id);
  if (!item) return null;
  Object.assign(item, patch);
  return item;
}

/** Admin-only catalog removal (see inventoryCatalog in middleware/actorAccess.js). */
function deleteItem(item_id) {
  const item = dataStore.inventoryItems.find((i) => i.item_id === item_id);
  if (!item) return null;
  dataStore.inventoryItems = dataStore.inventoryItems.filter(
    (i) => i.item_id !== item_id,
  );
  return { deleted: true, item_id: Number(item_id) };
}

// PURCHASE_REQUEST
function findAllRequests() {
  return dataStore.purchaseRequests;
}

function createRequest(request) {
  const newReq = {
    request_id:
      dataStore.purchaseRequests.length > 0
        ? Math.max(...dataStore.purchaseRequests.map((r) => r.request_id)) + 1
        : 1,
    item_id: Number(request.item_id),
    quantity: Number(request.quantity) || 1,
    status: request.status || 'PENDING',
    requested_at: new Date().toISOString(),
    organization_id: request.organization_id ? Number(request.organization_id) : null,
    hospital_id: request.hospital_id ? Number(request.hospital_id) : null,
    // Set when the requester attaches a supplier invoice/quote via
    // POST /uploads/inventory (front-end/HOM/inventory.js's Restock modal).
    invoice_url: request.invoice_url || null,
  };
  dataStore.purchaseRequests.push(newReq);
  return newReq;
}

function updateRequest(request_id, patch) {
  const req = dataStore.purchaseRequests.find(
    (r) => r.request_id === request_id,
  );
  if (!req) return null;
  Object.assign(req, patch);
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
