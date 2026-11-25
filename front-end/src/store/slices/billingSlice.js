'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { billing } from '../../api/endpoints/billing.js';
import { addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

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
    payments: [],
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addWriteCases(builder, createPayment, (state, action) => {
      upsertByKey(state.payments, 'payment_id', action.payload);
    });
  },
});

export default billingSlice.reducer;
