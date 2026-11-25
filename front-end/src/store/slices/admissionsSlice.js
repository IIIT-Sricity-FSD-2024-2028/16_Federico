'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { admissions } from '../../api/endpoints/admissions.js';
import { addReadCases, apiThunk } from '../thunkHelpers.js';

// The backend has no DELETE /admission.
export const fetchAdmissions = apiThunk(
  'admissions/fetchAll',
  () => admissions.list(),
  'Failed to load admissions',
);

const admissionsSlice = createSlice({
  name: 'admissions',
  initialState: { items: [], loading: false, pending: 0, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchAdmissions, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
  },
});

export const selectAdmissions = (state) => state.admissions.items;

export default admissionsSlice.reducer;
