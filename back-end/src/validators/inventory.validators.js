'use strict';

const { partial } = require('./engine');

// Port of inventory/dto/inventory.dto.ts
const createInventoryItemRules = [
  { field: 'item_name', checks: ['isNotEmpty', 'isString'] },
  { field: 'category', checks: ['isNotEmpty', 'isString'] },
  { field: 'stock_quantity', checks: ['isNotEmpty', 'isInt'] },
  { field: 'reorder_level', checks: ['isNotEmpty', 'isInt'] },
  { field: 'service_id', checks: ['isInt'], optional: true },
];

const updateInventoryItemRules = partial(createInventoryItemRules);

const createPurchaseRequestRules = [
  { field: 'item_id', checks: ['isNotEmpty', 'isInt'] },
  { field: 'quantity_requested', checks: ['isNotEmpty', 'isInt'] },
  { field: 'status', checks: ['isNotEmpty', 'isString'] },
  { field: 'requested_by', checks: ['isNotEmpty', 'isInt'] },
  // Set from POST /uploads/inventory's response URL when a supplier
  // invoice/quote is attached to the request.
  { field: 'invoice_url', checks: ['isString'], optional: true },
];

const updatePurchaseRequestRules = partial(createPurchaseRequestRules);

module.exports = {
  createInventoryItemRules,
  updateInventoryItemRules,
  createPurchaseRequestRules,
  updatePurchaseRequestRules,
};
