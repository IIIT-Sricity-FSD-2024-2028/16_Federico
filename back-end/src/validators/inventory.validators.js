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

const updatePurchaseRequestRules = partial([
  { field: 'quantity_requested', checks: ['isInt'] },
  { field: 'status', checks: ['isNotEmpty', 'isString'] },
  { field: 'invoice_url', checks: ['isString'] },
]);

function allowOnlyFields(fields) {
  const allowed = new Set(fields);
  return function rejectUnexpectedFields(req, res, next) {
    const unexpected = Object.keys(req.body || {}).filter((field) => !allowed.has(field));
    if (unexpected.length > 0) {
      return res.status(400).json({
        message: unexpected.map((field) => `${field} is not an allowed field`),
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    return next();
  };
}

const allowInventoryItemUpdateFields = allowOnlyFields([
  'item_name',
  'category',
  'stock_quantity',
  'reorder_level',
  'service_id',
]);
const allowPurchaseRequestUpdateFields = allowOnlyFields([
  'quantity_requested',
  'status',
  'invoice_url',
]);

module.exports = {
  createInventoryItemRules,
  updateInventoryItemRules,
  createPurchaseRequestRules,
  updatePurchaseRequestRules,
  allowInventoryItemUpdateFields,
  allowPurchaseRequestUpdateFields,
};
