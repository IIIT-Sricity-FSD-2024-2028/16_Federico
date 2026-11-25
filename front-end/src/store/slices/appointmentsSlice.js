'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { appointments } from '../../api/endpoints/appointments.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

// The backend has no DELETE /appointment; cancelling is a status update, which
// stays an update.
export const fetchAppointments = apiThunk(
  'appointments/fetchAll',
  () => appointments.list(),
  'Failed to load appointments',
);
export const createAppointment = apiThunk(
  'appointments/create',
  (payload) => appointments.create(payload),
  'Failed to create appointment',
);
export const updateAppointment = apiThunk(
  'appointments/update',
  ({ id, patch }) => appointments.update(id, patch),
  'Failed to update appointment',
);

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState: { items: [], current: null, loading: false, pending: 0, saving: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchAppointments, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
    addWriteCases(builder, createAppointment, (state, action) => {
      upsertByKey(state.items, 'appointment_id', action.payload);
    });
    addWriteCases(builder, updateAppointment, (state, action) => {
      upsertByKey(state.items, 'appointment_id', action.payload);
    });
  },
});

export const selectAppointments = (state) => state.appointments.items;

export default appointmentsSlice.reducer;
