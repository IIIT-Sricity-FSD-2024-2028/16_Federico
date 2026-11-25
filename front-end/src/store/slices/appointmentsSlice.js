'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { appointments } from '../../api/endpoints/appointments.js';
import { addReadCases, apiThunk } from '../thunkHelpers.js';

// The backend has no DELETE /appointment; cancelling is a status update, which
// stays an update.
export const fetchAppointments = apiThunk(
  'appointments/fetchAll',
  () => appointments.list(),
  'Failed to load appointments',
);

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState: { items: [], loading: false, pending: 0, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchAppointments, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
  },
});

export const selectAppointments = (state) => state.appointments.items;

export default appointmentsSlice.reducer;
