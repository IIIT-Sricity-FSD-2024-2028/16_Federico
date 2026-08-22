'use strict';

const inventoryService = require('./inventory.service');

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
});
