'use strict';

const dataStore = require('../store/dataStore');
const authService = require('./auth.service');
const rbacService = require('./rbac.service');
const billingService = require('./billing.service');

const DEFAULT_RATES_FALLBACK = {
  base_platform_fee: 3000,
  base_fee: 3000,
  rates: {
    GENERAL_BEDS: 150,
    ICU_BEDS: 600,
    PRIVATE_BEDS: 350,
    DOCTOR_SEATS: 150,
    STAFF_SEATS: 200,
    BILLING_TERMINALS: 500,
    WAREHOUSES: 1000,
    PATIENT_ADMISSIONS: 10,
  },
};

// Exact key list from the original DataController — order matters only
// for readability, not behavior.
const SYNCED_KEYS = [
  'roles',
  'users',
  'patients',
  'patientInsurances',
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
      changed.push(
        Array.isArray(state[key]) ? `${key}(${state[key].length})` : key,
      );
    }
  }
  return { success: true, changed };
}

function getAdminDashboard(organizationId, hospitalId = null) {
  const oid = Number(organizationId);
  const byOrg = (arr) =>
    (Array.isArray(arr) ? arr : []).filter((item) => Number(item.organization_id) === oid);

  const wards = byOrg(dataStore.wards);
  const beds = byOrg(dataStore.beds);
  const patients = byOrg(dataStore.patients);
  const doctors = byOrg(dataStore.doctors);
  const admissions = byOrg(dataStore.admissions);
  const preRequests = byOrg(dataStore.preRequests);
  const appointments = byOrg(dataStore.appointments);
  const inventoryItems = byOrg(dataStore.inventoryItems);
  const activityLog = byOrg(dataStore.activityLog);
  const staff = rbacService.staffFor(oid);
  const payments = byOrg(dataStore.payments);

  const ledgers = byOrg(dataStore.ledgers).map((ledger) => ({
    ...ledger,
    total_amount: billingService
      .findLedgerEntries(ledger.ledger_id)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0),
  }));

  const totalRevenue = ledgers.reduce((sum, l) => sum + Number(l.total_amount || 0), 0);
  const collected = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const outstandingBalance = Math.max(0, totalRevenue - collected);
  const collectionRate = totalRevenue > 0 ? Math.round((collected / totalRevenue) * 100) : 0;

  const ratesSource = dataStore.platformRates || DEFAULT_RATES_FALLBACK;
  const rates = {
    ...ratesSource,
    base_platform_fee: Number(ratesSource.base_platform_fee ?? 3000),
    base_fee: Number(ratesSource.base_platform_fee ?? 3000),
    rates: { ...DEFAULT_RATES_FALLBACK.rates, ...(ratesSource.rates || {}) },
  };

  return {
    tenant: authService.tenantContextForOrg(oid, hospitalId),
    rates,
    summary: {
      totalRevenue,
      collected,
      outstandingBalance,
      collectionRate,
    },
    wards,
    beds,
    patients,
    staff,
    doctors,
    admissions,
    preRequests,
    appointments,
    inventoryItems,
    activityLog,
    ledgers,
    payments,
  };
}

module.exports = { getFullState, updateFullState, getAdminDashboard, SYNCED_KEYS };
