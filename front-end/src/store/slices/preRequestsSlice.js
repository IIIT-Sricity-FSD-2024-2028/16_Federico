'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { preRequests } from '../../api/endpoints/preRequests.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

// The backend has no DELETE /pre-requests; rejecting / cancelling / discharging
// are status updates and stay updates.
export const fetchPreRequests = apiThunk(
  'preRequests/fetchAll',
  () => preRequests.list(),
  'Failed to load requests',
);
export const fetchPreRequest = apiThunk(
  'preRequests/fetchOne',
  (id) => preRequests.get(id),
  'Failed to load request',
);
export const createPreRequest = apiThunk(
  'preRequests/create',
  (payload) => preRequests.create(payload),
  'Failed to create request',
);
export const updatePreRequest = apiThunk(
  'preRequests/update',
  ({ id, patch }) => preRequests.update(id, patch),
  'Failed to update request',
);
export const checkInPreRequest = apiThunk(
  'preRequests/checkIn',
  ({ id, payload }) => preRequests.checkIn(id, payload),
  'Failed to check in',
);

const preRequestsSlice = createSlice({
  name: 'preRequests',
  initialState: { items: [], current: null, loading: false, pending: 0, saving: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchPreRequests, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchPreRequest, (state, action) => {
      state.current = action.payload || null;
    });
    addWriteCases(builder, createPreRequest, (state, action) => {
      upsertByKey(state.items, 'pre_request_id', action.payload);
    });
    addWriteCases(builder, updatePreRequest, (state, action) => {
      upsertByKey(state.items, 'pre_request_id', action.payload);
    });
    addWriteCases(builder, checkInPreRequest, (state, action) => {
      upsertByKey(state.items, 'pre_request_id', action.payload);
    });
  },
});

export const selectPreRequests = (state) => state.preRequests.items;

export default preRequestsSlice.reducer;
