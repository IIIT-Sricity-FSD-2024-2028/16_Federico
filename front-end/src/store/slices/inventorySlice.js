'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { inventory } from '../../api/endpoints/inventory.js';
import { addReadCases, addWriteCases, apiThunk, removeByKey, upsertByKey } from '../thunkHelpers.js';

export const fetchInventoryItems = apiThunk(
  'inventory/fetchItems',
  () => inventory.items.list(),
  'Failed to load inventory',
);
export const createInventoryItem = apiThunk(
  'inventory/createItem',
  (payload) => inventory.items.create(payload),
  'Failed to create inventory item',
);
export const updateInventoryItem = apiThunk(
  'inventory/updateItem',
  ({ id, patch }) => inventory.items.update(id, patch),
  'Failed to update inventory item',
);
export const deleteInventoryItem = apiThunk(
  'inventory/deleteItem',
  async (id) => {
    await inventory.items.remove(id);
    return id;
  },
  'Failed to delete inventory item',
);

// Purchase requests: the backend has no DELETE for these.
export const fetchPurchaseRequests = apiThunk(
  'inventory/fetchRequests',
  () => inventory.requests.list(),
  'Failed to load purchase requests',
);
export const createPurchaseRequest = apiThunk(
  'inventory/createRequest',
  (payload) => inventory.requests.create(payload),
  'Failed to create purchase request',
);
export const updatePurchaseRequest = apiThunk(
  'inventory/updateRequest',
  ({ id, patch }) => inventory.requests.update(id, patch),
  'Failed to update purchase request',
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: { items: [], requests: [], loading: false, pending: 0, saving: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchInventoryItems, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchPurchaseRequests, (state, action) => {
      state.requests = Array.isArray(action.payload) ? action.payload : [];
    });
    addWriteCases(builder, createInventoryItem, (state, action) => {
      upsertByKey(state.items, 'item_id', action.payload);
    });
    addWriteCases(builder, updateInventoryItem, (state, action) => {
      upsertByKey(state.items, 'item_id', action.payload);
    });
    addWriteCases(builder, deleteInventoryItem, (state, action) => {
      state.items = removeByKey(state.items, 'item_id', action.payload);
    });
    addWriteCases(builder, createPurchaseRequest, (state, action) => {
      upsertByKey(state.requests, 'request_id', action.payload);
    });
    addWriteCases(builder, updatePurchaseRequest, (state, action) => {
      upsertByKey(state.requests, 'request_id', action.payload);
    });
  },
});

export const selectInventoryItems = (state) => state.inventory.items;
export const selectPurchaseRequests = (state) => state.inventory.requests;

export default inventorySlice.reducer;
