'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { billing } from '../../api/endpoints/billing.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

/* ------------------------------ services ------------------------------ */
// The backend has no update/delete for services, ledgers, payments, receipts,
// discharge summaries or leaders - only the operations below exist.

export const fetchServices = apiThunk('billing/fetchServices', () => billing.services.list(), 'Failed to load services');

/* ------------------------------- ledgers ------------------------------ */

export const fetchLedgers = apiThunk('billing/fetchLedgers', () => billing.ledger.listAll(), 'Failed to load ledgers');
export const fetchLedgerEntries = apiThunk(
  'billing/fetchLedgerEntries',
  async (ledgerId) => ({ ledgerId, entries: await billing.ledger.entries(ledgerId) }),
  'Failed to load ledger entries',
);

/* ------------------------------ payments ------------------------------ */

export const createPayment = apiThunk(
  'billing/createPayment',
  (payload) => billing.payments.create(payload),
  'Failed to record payment',
);
export const fetchPatientBills = apiThunk(
  'billing/fetchPatientBills',
  async (patientId) => ({ patientId, bills: await billing.patient.bills(patientId) }),
  'Failed to load bills',
);
export const fetchPatientReceipts = apiThunk(
  'billing/fetchPatientReceipts',
  async (patientId) => ({ patientId, receipts: await billing.patient.receipts(patientId) }),
  'Failed to load receipts',
);

/* ---------------------------- discharge summary ---------------------------- */

export const fetchDischargeSummary = apiThunk(
  'billing/fetchDischargeSummary',
  async (admissionId) => ({
    admissionId,
    summary: (await billing.dischargeSummary.getByAdmission(admissionId)) || null,
  }),
  'Failed to load discharge summary',
);

/* ---------------------------- leaders (staged charges) ---------------------------- */

export const createLeader = apiThunk(
  'billing/createLeader',
  (payload) => billing.leaders.create(payload),
  'Failed to stage charge',
);

/* --------------------------------- slice --------------------------------- */

const billingSlice = createSlice({
  name: 'billing',
  initialState: {
    services: [],
    ledgers: [],
    ledgerEntries: {},
    payments: [],
    dischargeSummaries: {},
    patientBills: {},
    patientReceipts: {},
    loading: false,
    pending: 0,
    saving: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    addReadCases(builder, fetchServices, (state, action) => {
      state.services = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchLedgers, (state, action) => {
      state.ledgers = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchLedgerEntries, (state, action) => {
      state.ledgerEntries[action.payload.ledgerId] = Array.isArray(action.payload.entries)
        ? action.payload.entries
        : [];
    });
    addReadCases(builder, fetchPatientBills, (state, action) => {
      state.patientBills[action.payload.patientId] = action.payload.bills || [];
    });
    addReadCases(builder, fetchPatientReceipts, (state, action) => {
      state.patientReceipts[action.payload.patientId] = action.payload.receipts || [];
    });
    addReadCases(builder, fetchDischargeSummary, (state, action) => {
      state.dischargeSummaries[action.payload.admissionId] = action.payload.summary;
    });

    addWriteCases(builder, createPayment, (state, action) => {
      upsertByKey(state.payments, 'payment_id', action.payload);
    });
    addWriteCases(builder, createLeader, (state, action) => {
      upsertByKey(state.leaders, 'leader_id', action.payload);
    });
  },
});

export const selectServices = (state) => state.billing.services;
export const selectLedgers = (state) => state.billing.ledgers;

export default billingSlice.reducer;
