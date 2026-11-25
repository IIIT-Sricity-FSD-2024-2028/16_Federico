'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { preRequests } from '../../api/endpoints/preRequests.js';
import { addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

// The backend has no DELETE /pre-requests; rejecting / cancelling / discharging
// are status updates and stay updates.
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

const preRequestsSlice = createSlice({
  name: 'preRequests',
  initialState: { items: [], saving: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addWriteCases(builder, createPreRequest, (state, action) => {
      upsertByKey(state.items, 'pre_request_id', action.payload);
    });
    addWriteCases(builder, updatePreRequest, (state, action) => {
      upsertByKey(state.items, 'pre_request_id', action.payload);
    });
  },
});

export default preRequestsSlice.reducer;
