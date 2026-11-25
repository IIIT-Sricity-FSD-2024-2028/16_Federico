'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { wards } from '../../api/endpoints/wards.js';
import { addReadCases, addWriteCases, apiThunk, removeByKey, upsertByKey } from '../thunkHelpers.js';

export const fetchWards = apiThunk('wards/fetchAll', () => wards.list(), 'Failed to load wards');
export const createWard = apiThunk('wards/create', (payload) => wards.create(payload), 'Failed to create ward');
export const updateWard = apiThunk(
  'wards/update',
  ({ id, patch }) => wards.update(id, patch),
  'Failed to update ward',
);
export const deleteWard = apiThunk(
  'wards/delete',
  async (id) => {
    await wards.remove(id);
    return id;
  },
  'Failed to delete ward',
);

export const fetchBeds = apiThunk('wards/fetchBeds', () => wards.beds(), 'Failed to load beds');
export const fetchBedsInWard = apiThunk(
  'wards/fetchBedsInWard',
  (wardId) => wards.bedsInWard(wardId),
  'Failed to load beds',
);
export const createBed = apiThunk('wards/createBed', (payload) => wards.createBed(payload), 'Failed to create bed');
export const updateBedStatus = apiThunk(
  'wards/updateBedStatus',
  ({ bedId, status }) => wards.updateBedStatus(bedId, status),
  'Failed to update bed',
);

export const fetchBedRequests = apiThunk(
  'wards/fetchBedRequests',
  () => wards.bedRequests.list(),
  'Failed to load bed requests',
);
export const createBedRequest = apiThunk(
  'wards/createBedRequest',
  (payload) => wards.bedRequests.create(payload),
  'Failed to create bed request',
);
export const updateBedRequest = apiThunk(
  'wards/updateBedRequest',
  ({ id, patch }) => wards.bedRequests.update(id, patch),
  'Failed to update bed request',
);
export const allocateBed = apiThunk(
  'wards/allocateBed',
  ({ requestId, bedId }) => wards.bedRequests.allocate(requestId, bedId),
  'Failed to allocate bed',
);
export const denyBedRequest = apiThunk(
  'wards/denyBedRequest',
  (requestId) => wards.bedRequests.deny(requestId),
  'Failed to deny bed request',
);

const wardsSlice = createSlice({
  name: 'wards',
  initialState: {
    items: [],
    beds: [],
    bedsInWard: [],
    bedRequests: [],
    current: null,
    loading: false,
    pending: 0,
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchWards, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchBeds, (state, action) => {
      state.beds = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchBedsInWard, (state, action) => {
      state.bedsInWard = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchBedRequests, (state, action) => {
      state.bedRequests = Array.isArray(action.payload) ? action.payload : [];
    });
    addWriteCases(builder, createWard, (state, action) => {
      upsertByKey(state.items, 'ward_id', action.payload);
    });
    addWriteCases(builder, updateWard, (state, action) => {
      upsertByKey(state.items, 'ward_id', action.payload);
    });
    addWriteCases(builder, deleteWard, (state, action) => {
      state.items = removeByKey(state.items, 'ward_id', action.payload);
    });
    addWriteCases(builder, createBed, (state, action) => {
      upsertByKey(state.beds, 'bed_id', action.payload);
    });
    addWriteCases(builder, updateBedStatus, (state, action) => {
      upsertByKey(state.beds, 'bed_id', action.payload);
    });
    addWriteCases(builder, createBedRequest, (state, action) => {
      upsertByKey(state.bedRequests, 'bed_request_id', action.payload);
    });
    addWriteCases(builder, updateBedRequest, (state, action) => {
      upsertByKey(state.bedRequests, 'bed_request_id', action.payload);
    });
    addWriteCases(builder, allocateBed, (state, action) => {
      upsertByKey(state.bedRequests, 'bed_request_id', action.payload);
    });
    addWriteCases(builder, denyBedRequest, (state, action) => {
      upsertByKey(state.bedRequests, 'bed_request_id', action.payload);
    });
  },
});

export const selectWards = (state) => state.wards.items;
export const selectBeds = (state) => state.wards.beds;
export const selectBedRequests = (state) => state.wards.bedRequests;

export default wardsSlice.reducer;
