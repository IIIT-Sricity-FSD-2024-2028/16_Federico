'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { rbac } from '../../api/endpoints/rbac.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

export const fetchStaff = apiThunk('rbac/fetchStaff', () => rbac.staff(), 'Failed to load staff');
export const createStaff = apiThunk('rbac/createStaff', (payload) => rbac.createStaff(payload), 'Failed to create staff');
export const setStaffActive = apiThunk(
  'rbac/setStaffActive',
  ({ userId, isActive }) => rbac.setStaffActive(userId, isActive),
  'Failed to update staff status',
);
export const setStaffRole = apiThunk(
  'rbac/setStaffRole',
  ({ userId, actorRole }) => rbac.setStaffRole(userId, actorRole),
  'Failed to update staff role',
);

const rbacSlice = createSlice({
  name: 'rbac',
  initialState: { staff: [], loading: false, pending: 0, saving: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchStaff, (state, action) => {
      state.staff = Array.isArray(action.payload) ? action.payload : [];
    });
    addWriteCases(builder, createStaff, (state, action) => {
      upsertByKey(state.staff, 'user_id', action.payload);
    });
    addWriteCases(builder, setStaffActive, (state, action) => {
      upsertByKey(state.staff, 'user_id', action.payload);
    });
    addWriteCases(builder, setStaffRole, (state, action) => {
      upsertByKey(state.staff, 'user_id', action.payload);
    });
  },
});

export const selectStaff = (state) => state.rbac.staff;

export default rbacSlice.reducer;
