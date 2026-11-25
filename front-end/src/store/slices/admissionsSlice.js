'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { admissions } from '../../api/endpoints/admissions.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

// The backend has no DELETE /admission.
export const fetchAdmissions = apiThunk(
  'admissions/fetchAll',
  () => admissions.list(),
  'Failed to load admissions',
);
export const fetchAdmission = apiThunk(
  'admissions/fetchOne',
  (id) => admissions.get(id),
  'Failed to load admission',
);
export const createAdmission = apiThunk(
  'admissions/create',
  (payload) => admissions.create(payload),
  'Failed to create admission',
);
export const updateAdmission = apiThunk(
  'admissions/update',
  ({ id, patch }) => admissions.update(id, patch),
  'Failed to update admission',
);

const admissionsSlice = createSlice({
  name: 'admissions',
  initialState: { items: [], current: null, loading: false, pending: 0, saving: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchAdmissions, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchAdmission, (state, action) => {
      state.current = action.payload || null;
    });
    addWriteCases(builder, createAdmission, (state, action) => {
      upsertByKey(state.items, 'admission_id', action.payload);
    });
    addWriteCases(builder, updateAdmission, (state, action) => {
      upsertByKey(state.items, 'admission_id', action.payload);
    });
  },
});

export const selectAdmissions = (state) => state.admissions.items;

export default admissionsSlice.reducer;
