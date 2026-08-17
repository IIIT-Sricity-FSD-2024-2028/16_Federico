'use strict';

const dataStore = require('../store/dataStore');

// Exact key list from the original DataController — order matters only
// for readability, not behavior.
const SYNCED_KEYS = [
  'stateVersion',
  'roles',
  'users',
  'patients',
  'patientInsurances',
  'patientInsuranceDocuments',
  'doctors',
  'doctorAvailabilities',
  'appointments',
  'wards',
  'beds',
  'admissions',
  'dischargeSummaries',
  'services',
  'ledgers',
  'ledgerEntries',
  'insurances',
  'payments',
  'inventoryItems',
  'purchaseRequests',
];

function getFullState() {
  const state = {};
  for (const key of SYNCED_KEYS) {
    state[key] = dataStore[key];
  }
  return state;
}

function updateFullState(state) {
  const changed = [];
  for (const key of SYNCED_KEYS) {
    if (state && state[key]) {
      dataStore[key] = state[key];
      changed.push(Array.isArray(state[key]) ? `${key}(${state[key].length})` : key);
    }
  }
  return { success: true, changed };
}

module.exports = { getFullState, updateFullState, SYNCED_KEYS };
