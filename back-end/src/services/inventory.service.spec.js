'use strict';

const inventoryService = require('./inventory.service');
const dataStore = require('../store/dataStore');

describe('services/inventory.service', () => {
  it('deleteItem() removes a catalog item', () => {
    const item = inventoryService.createItem({
      item_name: 'Unit Test Bandage',
      category: 'Consumable',
      stock_quantity: 10,
      reorder_level: 2,
      organization_id: 999,
      hospital_id: 999,
    });

    const result = inventoryService.deleteItem(item.item_id);
    expect(result.deleted).toBe(true);
    expect(
      inventoryService.findAllItems().some((i) => i.item_id === item.item_id),
    ).toBe(false);
  });

  it('deleteItem() on an unknown id returns null', () => {
    expect(inventoryService.deleteItem(999999)).toBeNull();
  });

  it('updates only permitted inventory fields and rejects tenant/reference fields atomically', () => {
    const item = dataStore.inventoryItems.find((record) => Number(record.organization_id) === 1);
    const before = { ...item };
    expect(() => inventoryService.updateItem(item.item_id, { stock_quantity: 12, hospital_id: 2 })).toThrow(/cannot be updated/i);
    expect(item).toEqual(before);

    const updated = inventoryService.updateItem(item.item_id, { stock_quantity: 12 });
    expect(updated.stock_quantity).toBe(12);
    expect(updated.organization_id).toBe(before.organization_id);
    expect(updated.hospital_id).toBe(before.hospital_id);
  });

  it('allows only safe purchase request fields and keeps the two quantity fields in sync', () => {
    const request = dataStore.purchaseRequests.find((record) => Number(record.organization_id) === 1);
    const before = { ...request };
    expect(() => inventoryService.updateRequest(request.request_id, { status: 'APPROVED', item_id: 999999 })).toThrow(/cannot be updated/i);
    expect(request).toEqual(before);

    const updated = inventoryService.updateRequest(request.request_id, { quantity_requested: 3, status: 'APPROVED' });
    expect(updated.quantity_requested).toBe(3);
    expect(updated.quantity).toBe(3);
    expect(updated.item_id).toBe(before.item_id);
    expect(updated.organization_id).toBe(before.organization_id);
  });

  it('rejects a non-positive purchase quantity without mutating the request', () => {
    const request = dataStore.purchaseRequests.find((record) => Number(record.organization_id) === 1);
    const before = { ...request };
    expect(() => inventoryService.updateRequest(request.request_id, { quantity_requested: 0 })).toThrow(/positive integer/i);
    expect(request).toEqual(before);
  });
});
