'use strict';

const {
  updateInventoryItemRules,
  updatePurchaseRequestRules,
  allowInventoryItemUpdateFields,
  allowPurchaseRequestUpdateFields,
} = require('./inventory.validators');
const { validateBody } = require('./engine');

function run(middleware, body) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  let nextCalled = false;
  middleware({ body }, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

describe('inventory update request allowlists', () => {
  it('accepts the inventory payloads used by current frontend flows', () => {
    expect(run(allowInventoryItemUpdateFields, { stock_quantity: 4 }).nextCalled).toBe(true);
    expect(run(allowPurchaseRequestUpdateFields, { status: 'APPROVED' }).nextCalled).toBe(true);
    expect(run(allowPurchaseRequestUpdateFields, { quantity_requested: 2, invoice_url: '/uploads/inventory/test.pdf' }).nextCalled).toBe(true);
  });

  it('rejects tenant and identity fields on item updates', () => {
    const result = run(allowInventoryItemUpdateFields, { stock_quantity: 4, organization_id: 2 });
    expect(result.nextCalled).toBe(false);
    expect(result.res.statusCode).toBe(400);
    expect(result.res.body.message).toContain('organization_id is not an allowed field');
  });

  it('rejects item and requester reassignment on purchase request updates', () => {
    for (const body of [{ item_id: 2 }, { requested_by: 9 }, { hospital_id: 2 }]) {
      const result = run(allowPurchaseRequestUpdateFields, body);
      expect(result.nextCalled).toBe(false);
      expect(result.res.statusCode).toBe(400);
    }
  });

  it('validates quantity as an integer while leaving status-only UI updates valid', () => {
    expect(run(validateBody(updatePurchaseRequestRules), { status: 'APPROVED' }).nextCalled).toBe(true);
    expect(run(validateBody(updatePurchaseRequestRules), { quantity_requested: 1.5 }).res.statusCode).toBe(400);
    expect(run(validateBody(updateInventoryItemRules), { service_id: null }).nextCalled).toBe(true);
  });
});
