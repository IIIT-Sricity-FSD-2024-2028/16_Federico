'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { doctors } from '../../api/endpoints/doctors.js';
import { addReadCases, addWriteCases, apiThunk, removeByKey, upsertByKey } from '../thunkHelpers.js';

export const fetchDoctors = apiThunk('doctors/fetchAll', () => doctors.list(), 'Failed to load doctors');
export const fetchDoctor = apiThunk('doctors/fetchOne', (id) => doctors.get(id), 'Failed to load doctor');
export const createDoctor = apiThunk('doctors/create', (payload) => doctors.create(payload), 'Failed to create doctor');
export const updateDoctor = apiThunk(
  'doctors/update',
  ({ id, patch }) => doctors.update(id, patch),
  'Failed to update doctor',
);
export const deleteDoctor = apiThunk(
  'doctors/delete',
  async (id) => {
    await doctors.remove(id);
    return id;
  },
  'Failed to delete doctor',
);
export const fetchAllAvailabilities = apiThunk(
  'doctors/fetchAllAvailabilities',
  () => doctors.availabilityAll(),
  'Failed to load doctor availability',
);
export const fetchDoctorAvailability = apiThunk(
  'doctors/fetchAvailability',
  (id) => doctors.availabilityForDoctor(id),
  'Failed to load doctor availability',
);
export const createAvailability = apiThunk(
  'doctors/createAvailability',
  (payload) => doctors.createAvailability(payload),
  'Failed to create availability',
);
export const deleteAvailability = apiThunk(
  'doctors/deleteAvailability',
  async (id) => {
    await doctors.removeAvailability(id);
    return id;
  },
  'Failed to delete availability',
);

const initialState = {
  items: [],
  current: null,
  availabilities: [],
  doctorAvailability: [],
  loading: false,
  pending: 0,
  saving: false,
  error: null,
};

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchDoctors, (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchDoctor, (state, action) => {
      state.current = action.payload || null;
    });
    addReadCases(builder, fetchAllAvailabilities, (state, action) => {
      state.availabilities = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchDoctorAvailability, (state, action) => {
      state.doctorAvailability = Array.isArray(action.payload) ? action.payload : [];
    });
    addWriteCases(builder, createDoctor, (state, action) => {
      upsertByKey(state.items, 'doctor_id', action.payload);
    });
    addWriteCases(builder, updateDoctor, (state, action) => {
      upsertByKey(state.items, 'doctor_id', action.payload);
    });
    addWriteCases(builder, deleteDoctor, (state, action) => {
      state.items = removeByKey(state.items, 'doctor_id', action.payload);
    });
    addWriteCases(builder, createAvailability, (state, action) => {
      upsertByKey(state.availabilities, 'availability_id', action.payload);
    });
    addWriteCases(builder, deleteAvailability, (state, action) => {
      state.availabilities = removeByKey(state.availabilities, 'availability_id', action.payload);
    });
  },
});

export const selectDoctors = (state) => state.doctors.items;
export const selectDoctorAvailabilities = (state) => state.doctors.availabilities;

export default doctorsSlice.reducer;
