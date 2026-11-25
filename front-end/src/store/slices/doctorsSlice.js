'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { doctors } from '../../api/endpoints/doctors.js';
import { addReadCases, apiThunk } from '../thunkHelpers.js';

export const fetchDoctors = apiThunk('doctors/fetchAll', () => doctors.list(), 'Failed to load doctors');
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

const initialState = {
  items: [],
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
    addReadCases(builder, fetchAllAvailabilities, (state, action) => {
      state.availabilities = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchDoctorAvailability, (state, action) => {
      state.doctorAvailability = Array.isArray(action.payload) ? action.payload : [];
    });
  },
});

export const selectDoctors = (state) => state.doctors.items;
export const selectDoctorAvailabilities = (state) => state.doctors.availabilities;

export default doctorsSlice.reducer;
