'use strict';

import { createSlice } from '@reduxjs/toolkit';
import { billing } from '../../api/endpoints/billing.js';
import { addReadCases, addWriteCases, apiThunk, upsertByKey } from '../thunkHelpers.js';

/* ------------------------------ services ------------------------------ */
// The backend has no update/delete for services, ledgers, payments, receipts,
// discharge summaries or leaders - only the operations below exist.

export const fetchServices = apiThunk('billing/fetchServices', () => billing.services.list(), 'Failed to load services');
export const createService = apiThunk(
  'billing/createService',
  (payload) => billing.services.create(payload),
  'Failed to create service',
);

/* ------------------------------- ledgers ------------------------------ */

export const fetchLedgers = apiThunk('billing/fetchLedgers', () => billing.ledger.listAll(), 'Failed to load ledgers');
export const fetchLedgerByAdmission = apiThunk(
  'billing/fetchLedgerByAdmission',
  async (admissionId) => ({ admissionId, ledger: await billing.ledger.getByAdmission(admissionId) }),
  'Failed to load ledger',
);
export const createLedger = apiThunk(
  'billing/createLedger',
  (payload) => billing.ledger.create(payload),
  'Failed to create ledger',
);
export const fetchLedgerEntries = apiThunk(
  'billing/fetchLedgerEntries',
  async (ledgerId) => ({ ledgerId, entries: await billing.ledger.entries(ledgerId) }),
  'Failed to load ledger entries',
);
export const addLedgerEntry = apiThunk(
  'billing/addLedgerEntry',
  (payload) => billing.ledger.addEntry(payload),
  'Failed to add ledger entry',
);
export const dispatchLedger = apiThunk(
  'billing/dispatchLedger',
  (ledgerId) => billing.ledger.dispatch(ledgerId),
  'Failed to send bill',
);

/* ------------------------------ payments ------------------------------ */

export const fetchPayments = apiThunk('billing/fetchPayments', () => billing.payments.list(), 'Failed to load payments');
export const createPayment = apiThunk(
  'billing/createPayment',
  (payload) => billing.payments.create(payload),
  'Failed to record payment',
);
export const fetchReceipts = apiThunk('billing/fetchReceipts', () => billing.receipts.list(), 'Failed to load receipts');
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
export const createDischargeSummary = apiThunk(
  'billing/createDischargeSummary',
  (payload) => billing.dischargeSummary.create(payload),
  'Failed to create discharge summary',
);

/* ---------------------------- leaders (staged charges) ---------------------------- */

export const fetchLeaders = apiThunk('billing/fetchLeaders', () => billing.leaders.list(), 'Failed to load charges');
export const createLeader = apiThunk(
  'billing/createLeader',
  (payload) => billing.leaders.create(payload),
  'Failed to stage charge',
);
export const approveLeader = apiThunk(
  'billing/approveLeader',
  (id) => billing.leaders.approve(id),
  'Failed to approve charge',
);

/* --------------------------------- slice --------------------------------- */

const billingSlice = createSlice({
  name: 'billing',
  initialState: {
    services: [],
    ledgers: [],
    ledgerByAdmission: {},
    ledgerEntries: {},
    payments: [],
    receipts: [],
    dischargeSummaries: {},
    leaders: [],
    patientBills: {},
    patientReceipts: {},
    // FA portal state (was FaContext): the admission the views share, the
    // reload counter the views depend on, inline form error slots, and the
    // deduction currently shown in the settlement form (null while that form is
    // not on screen) - what the payment actions used to read off the DOM.
    fa: { currentAdmissionId: null, version: 0, formErrors: {}, coverageDeduction: null },
    loading: false,
    pending: 0,
    saving: false,
    error: null,
  },
  reducers: {
    setFaCurrentAdmission(state, action) {
      state.fa.currentAdmissionId = action.payload;
    },
    bumpFaVersion(state) {
      state.fa.version += 1;
    },
    setFaFormError(state, action) {
      state.fa.formErrors[action.payload.id] = action.payload.message;
    },
    clearFaFormError(state, action) {
      state.fa.formErrors[action.payload] = undefined;
    },
    setFaCoverageDeduction(state, action) {
      state.fa.coverageDeduction = action.payload;
    },
    resetFa(state) {
      state.fa = { currentAdmissionId: null, version: 0, formErrors: {}, coverageDeduction: null };
    },
  },
  extraReducers: (builder) => {
    addReadCases(builder, fetchServices, (state, action) => {
      state.services = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchLedgers, (state, action) => {
      state.ledgers = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchLedgerByAdmission, (state, action) => {
      state.ledgerByAdmission[action.payload.admissionId] = action.payload.ledger || null;
    });
    addReadCases(builder, fetchLedgerEntries, (state, action) => {
      state.ledgerEntries[action.payload.ledgerId] = Array.isArray(action.payload.entries)
        ? action.payload.entries
        : [];
    });
    addReadCases(builder, fetchPayments, (state, action) => {
      state.payments = Array.isArray(action.payload) ? action.payload : [];
    });
    addReadCases(builder, fetchReceipts, (state, action) => {
      state.receipts = Array.isArray(action.payload) ? action.payload : [];
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
    addReadCases(builder, fetchLeaders, (state, action) => {
      state.leaders = Array.isArray(action.payload) ? action.payload : [];
    });

    addWriteCases(builder, createService, (state, action) => {
      upsertByKey(state.services, 'service_id', action.payload);
    });
    addWriteCases(builder, createLedger, (state, action) => {
      upsertByKey(state.ledgers, 'ledger_id', action.payload);
    });
    addWriteCases(builder, addLedgerEntry, (state, action) => {
      const entry = action.payload;
      if (entry && entry.ledger_id !== undefined && state.ledgerEntries[entry.ledger_id]) {
        upsertByKey(state.ledgerEntries[entry.ledger_id], 'entry_id', entry);
      }
    });
    addWriteCases(builder, dispatchLedger, (state, action) => {
      upsertByKey(state.ledgers, 'ledger_id', action.payload);
    });
    addWriteCases(builder, createPayment, (state, action) => {
      upsertByKey(state.payments, 'payment_id', action.payload);
    });
    addWriteCases(builder, createDischargeSummary, (state, action) => {
      const summary = action.payload;
      if (summary && summary.admission_id !== undefined) {
        state.dischargeSummaries[summary.admission_id] = summary;
      }
    });
    addWriteCases(builder, createLeader, (state, action) => {
      upsertByKey(state.leaders, 'leader_id', action.payload);
    });
    addWriteCases(builder, approveLeader, (state, action) => {
      upsertByKey(state.leaders, 'leader_id', action.payload);
    });
  },
});

export const {
  setFaCurrentAdmission,
  bumpFaVersion,
  setFaFormError,
  clearFaFormError,
  setFaCoverageDeduction,
  resetFa,
} = billingSlice.actions;

export const selectServices = (state) => state.billing.services;
export const selectLedgers = (state) => state.billing.ledgers;
export const selectLeaders = (state) => state.billing.leaders;
export const selectReceipts = (state) => state.billing.receipts;
export const selectFa = (state) => state.billing.fa;

export default billingSlice.reducer;
