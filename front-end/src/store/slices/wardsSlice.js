'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { wards } from '../../api/endpoints/wards.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

export const fetchWards = apiThunk('wards/fetchAll', () => wards.list(), 'Failed to load wards');

export const fetchBeds = apiThunk('wards/fetchBeds', () => wards.beds(), 'Failed to load beds');

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

const wardsSlice = createSlice({
  name: 'wards',
  initialState: {
    items: [],
    beds: [],
    bedRequests: [],
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
    addReadCases(builder, fetchBedRequests, (state, action) => {
      state.bedRequests = Array.isArray(action.payload) ? action.payload : [];
    });
    addWriteCases(builder, createBedRequest, (state, action) => {
      upsertByKey(state.bedRequests, 'bed_request_id', action.payload);
    });
  },
});

export const selectWards = (state) => state.wards.items;
export const selectBeds = (state) => state.wards.beds;
export const selectBedRequests = (state) => state.wards.bedRequests;

export default wardsSlice.reducer;
