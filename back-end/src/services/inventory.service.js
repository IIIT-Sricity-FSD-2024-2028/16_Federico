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
    ...item,
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
    requested_at: new Date().toISOString(),
    ...request,
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
  findAllRequests,
  createRequest,
  updateRequest,
};
