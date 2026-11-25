'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { rbac } from '../../api/endpoints/rbac.js';
import { addReadCases, addWriteCases, apiThunk, removeByKey, upsertByKey } from '../thunkHelpers.js';
import { fetchAdminDashboard } from '../adminThunks.js';

export const fetchStaff = apiThunk('rbac/fetchStaff', () => rbac.staff(), 'Failed to load staff');
export const createStaff = apiThunk('rbac/createStaff', (payload) => rbac.createStaff(payload), 'Failed to create staff');
export const setStaffActive = apiThunk(
  'rbac/setStaffActive',
  ({ userId, isActive }) => rbac.setStaffActive(userId, isActive),
  'Failed to update staff status',
);
export const deleteStaff = apiThunk(
  'rbac/deleteStaff',
  async (userId) => {
    await rbac.deleteStaff(userId);
    return userId;
  },
  'Failed to delete staff account',
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
    addWriteCases(builder, deleteStaff, (state, action) => {
      state.staff = removeByKey(state.staff, 'user_id', action.payload);
    });
    builder.addCase(fetchAdminDashboard.fulfilled, (state, action) => {
      if (Array.isArray(action.payload?.staff)) state.staff = action.payload.staff;
    });
  },
});

export const selectStaff = (state) => state.rbac.staff;

export default rbacSlice.reducer;
