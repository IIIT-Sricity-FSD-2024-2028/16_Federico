'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { billing } from '../../api/endpoints/billing.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

/* ------------------------------- ledgers ------------------------------ */

export const fetchLedgers = apiThunk('billing/fetchLedgers', () => billing.ledger.listAll(), 'Failed to load ledgers');

/* ------------------------------ payments ------------------------------ */
// The backend has no update/delete for services, ledgers, payments, receipts,
// discharge summaries or leaders - only the operations below exist.

export const createPayment = apiThunk(
  'billing/createPayment',
  (payload) => billing.payments.create(payload),
  'Failed to record payment',
);

/* --------------------------------- slice --------------------------------- */

const billingSlice = createSlice({
  name: 'billing',
  initialState: {
    ledgers: [],
    payments: [],
    loading: false,
    pending: 0,
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchLedgers, (state, action) => {
      state.ledgers = Array.isArray(action.payload) ? action.payload : [];
    });

    addWriteCases(builder, createPayment, (state, action) => {
      upsertByKey(state.payments, 'payment_id', action.payload);
    });
  },
});

export const selectLedgers = (state) => state.billing.ledgers;

export default billingSlice.reducer;
