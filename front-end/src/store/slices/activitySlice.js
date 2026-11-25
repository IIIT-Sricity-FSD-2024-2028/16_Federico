'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { activityLog } from '../../api/endpoints/activity.js';
import { addReadCases, apiThunk } from '../thunkHelpers.js';

// The activity log is read-only on the backend.
export const fetchActivityLog = apiThunk(
  'activity/fetchAll',
  () => activityLog.list(),
  'Failed to load activity log',
);

const activitySlice = createSlice({
  name: 'activity',
  initialState: { items: [], loading: false, pending: 0, saving: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchActivityLog, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
  },
});

export const selectActivityLog = (state) => state.activity.items;

export default activitySlice.reducer;
