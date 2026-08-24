'use strict';

const { inventoryRepository } = require('../repositories');

// Inventory Items
function findAllItems() {
  return inventoryRepository.findAll();
}

function createItem(item) {
  return inventoryRepository.create({
    item_name: item.item_name,
    category: item.category || 'General',
    stock_quantity: Number(item.stock_quantity) || 0,
    reorder_level: Number(item.reorder_level) || 10,
    service_id: item.service_id ? Number(item.service_id) : null,
    organization_id: item.organization_id ? Number(item.organization_id) : null,
    hospital_id: item.hospital_id ? Number(item.hospital_id) : null,
  });
}

function updateItem(item_id, patch) {
  return inventoryRepository.update(item_id, patch);
}

function deleteItem(item_id) {
  const item = inventoryRepository.findById(item_id);
  if (!item) return null;
  const deleted = inventoryRepository.delete(item_id);
  return { deleted, item_id: Number(item_id) };
}

// Purchase Requests
function findAllRequests() {
  return inventoryRepository.findAllRequests();
}

function createRequest(request) {
  return inventoryRepository.createRequest({
    item_id: Number(request.item_id),
    quantity: Number(request.quantity) || 1,
    status: request.status || 'PENDING',
    requested_at: new Date().toISOString(),
    organization_id: request.organization_id ? Number(request.organization_id) : null,
    hospital_id: request.hospital_id ? Number(request.hospital_id) : null,
  });
}

function updateRequest(request_id, patch) {
  return inventoryRepository.updateRequest(request_id, patch);
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
