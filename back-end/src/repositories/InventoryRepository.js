'use strict';

const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventoryItems', 'item_id');
    this.requestsRepo = new BaseRepository('purchaseRequests', 'request_id');
  }

  // Item catalog
  findAllItems(predicate = null) {
    return this.findAll(predicate);
  }

  findItemById(itemId) {
    return this.findById(itemId);
  }

  createItem(item) {
    return this.create(item);
  }

  updateItem(itemId, patch) {
    return this.update(itemId, patch);
  }

  deleteItem(itemId) {
    return this.delete(itemId);
  }

  // Restock purchase requests
  findAllRequests(predicate = null) {
    return this.requestsRepo.findAll(predicate);
  }

  findRequestById(requestId) {
    return this.requestsRepo.findById(requestId);
  }

  createRequest(req) {
    return this.requestsRepo.create(req);
  }

  updateRequest(requestId, patch) {
    return this.requestsRepo.update(requestId, patch);
  }

  deleteRequest(requestId) {
    return this.requestsRepo.delete(requestId);
  }
}

module.exports = new InventoryRepository();
