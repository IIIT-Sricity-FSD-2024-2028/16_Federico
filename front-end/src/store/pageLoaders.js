'use strict';

import { createLoader, must, soft } from './loaders.js';
import { selectBillingOverview } from '../pages/fa/faHelpers.js';
import { fetchWards, fetchBeds, fetchBedRequests } from './slices/wardsSlice.js';
import { fetchPatients, fetchAllInsurance, fetchPatientInsurance } from './slices/patientsSlice.js';
import { fetchLedgers, fetchLedgerEntries, fetchLeaders, fetchReceipts, fetchServices } from './slices/billingSlice.js';
import { fetchInventoryItems, fetchPurchaseRequests } from './slices/inventorySlice.js';
import { fetchAdmissions } from './slices/admissionsSlice.js';
import { fetchPreRequests } from './slices/preRequestsSlice.js';
import { fetchAppointments } from './slices/appointmentsSlice.js';
import { fetchDoctors, fetchAllAvailabilities } from './slices/doctorsSlice.js';
import { fetchActivityLog } from './slices/activitySlice.js';

/* ------------------------------------ HOM ------------------------------------- */

/** HOM dashboard (polled every 15s): seven reads, each tolerant of failure. */
export const loadHomDashboard = createLoader('homDashboard', async (_arg, { dispatch }) => {
  await Promise.all([
    soft(dispatch(fetchPreRequests())),
    soft(dispatch(fetchPatients())),
    soft(dispatch(fetchWards())),
    soft(dispatch(fetchBeds())),
    soft(dispatch(fetchBedRequests())),
    soft(dispatch(fetchActivityLog())),
    soft(dispatch(fetchDoctors())),
  ]);
});

/** HOM bed management (polled every 15s): six reads, each tolerant of failure. */
export const loadHomBeds = createLoader('homBeds', async (_arg, { dispatch }) => {
  await Promise.all([
    soft(dispatch(fetchWards())),
    soft(dispatch(fetchBeds())),
    soft(dispatch(fetchBedRequests())),
    soft(dispatch(fetchPatients())),
    soft(dispatch(fetchPreRequests())),
    soft(dispatch(fetchDoctors())),
  ]);
});

/** HOM patient flow (polled every 15s): six reads, each tolerant of failure. */
export const loadHomPatientFlow = createLoader('homPatientFlow', async (_arg, { dispatch }) => {
  await Promise.all([
    soft(dispatch(fetchPreRequests())),
    soft(dispatch(fetchPatients())),
    soft(dispatch(fetchDoctors())),
    soft(dispatch(fetchBeds())),
    soft(dispatch(fetchAdmissions())),
    soft(dispatch(fetchLedgers())),
  ]);
});

/** HOM inventory (polled every 15s): six reads, each tolerant of failure. */
export const loadHomInventory = createLoader('homInventory', async (_arg, { dispatch }) => {
  await Promise.all([
    soft(dispatch(fetchInventoryItems())),
    soft(dispatch(fetchPurchaseRequests())),
    soft(dispatch(fetchPatients())),
    soft(dispatch(fetchServices())),
    soft(dispatch(fetchAdmissions())),
    soft(dispatch(fetchBeds())),
  ]);
});

/* ------------------------------------ PRE ------------------------------------- */

/** PRE dashboard: five reads, each tolerant of failure. */
export const loadPreDashboard = createLoader('preDashboard', async (_arg, { dispatch }) => {
  await Promise.all([
    soft(dispatch(fetchPreRequests())),
    soft(dispatch(fetchPatients())),
    soft(dispatch(fetchDoctors())),
    soft(dispatch(fetchWards())),
    soft(dispatch(fetchBedRequests())),
  ]);
});

/** PRE requests: requests, patients, doctors - a failure of any one fails the page. */
export const loadPreRequests = createLoader('preRequests', async (_arg, { dispatch }) => {
  await Promise.all([must(dispatch(fetchPreRequests())), must(dispatch(fetchPatients())), must(dispatch(fetchDoctors()))]);
});

/** PRE admitted patients: requests, patients, doctors, beds - any failure fails the page. */
export const loadPreAdmitted = createLoader('preAdmitted', async (_arg, { dispatch }) => {
  await Promise.all([
    must(dispatch(fetchPreRequests())),
    must(dispatch(fetchPatients())),
    must(dispatch(fetchDoctors())),
    must(dispatch(fetchBeds())),
  ]);
});

/** PRE bed coordination: four reads, each tolerant of failure. */
export const loadPreBedCoordination = createLoader('preBedCoordination', async (_arg, { dispatch }) => {
  await Promise.all([
    soft(dispatch(fetchPatients())),
    soft(dispatch(fetchBedRequests())),
    soft(dispatch(fetchWards())),
    soft(dispatch(fetchBeds())),
  ]);
});

/** PRE discharge: requests, patients, doctors, beds must load; admissions and ledgers are optional. */
export const loadPreDischarge = createLoader('preDischarge', async (_arg, { dispatch }) => {
  await Promise.all([
    must(dispatch(fetchPreRequests())),
    must(dispatch(fetchPatients())),
    must(dispatch(fetchDoctors())),
    must(dispatch(fetchBeds())),
    soft(dispatch(fetchAdmissions())),
    soft(dispatch(fetchLedgers())),
  ]);
});

/** PRE rejected requests: requests, patients, doctors - any failure fails the page. */
export const loadPreRejected = createLoader('preRejected', async (_arg, { dispatch }) => {
  await Promise.all([must(dispatch(fetchPreRequests())), must(dispatch(fetchPatients())), must(dispatch(fetchDoctors()))]);
});

/** PRE patient records: nine reads, each tolerant of failure. */
export const loadPrePatientRecords = createLoader('prePatientRecords', async (_arg, { dispatch }) => {
  await Promise.all([
    soft(dispatch(fetchPatients())),
    soft(dispatch(fetchAllInsurance())),
    soft(dispatch(fetchPreRequests())),
    soft(dispatch(fetchAppointments())),
    soft(dispatch(fetchAdmissions())),
    soft(dispatch(fetchBeds())),
    soft(dispatch(fetchDoctors())),
    soft(dispatch(fetchBedRequests())),
    soft(dispatch(fetchWards())),
  ]);
});

/** PRE doctor roster: doctors and their availability, each tolerant of failure. */
export const loadPreDoctorRoster = createLoader('preDoctorRoster', async (_arg, { dispatch }) => {
  await Promise.all([soft(dispatch(fetchDoctors())), soft(dispatch(fetchAllAvailabilities()))]);
});

/** PRE create-appointment: patients, doctors and availability, each tolerant of failure. */
export const loadPreAppointment = createLoader('preAppointment', async (_arg, { dispatch }) => {
  await Promise.all([
    soft(dispatch(fetchPatients())),
    soft(dispatch(fetchDoctors())),
    soft(dispatch(fetchAllAvailabilities())),
  ]);
});

/* ------------------------------------ FA -------------------------------------- */

/** The FA portal's one data load: eight collections (the ledger list tolerating failure). */
function fetchBillingOverview(dispatch) {
  return Promise.all([
    must(dispatch(fetchAdmissions())),
    must(dispatch(fetchPatients())),
    must(dispatch(fetchBeds())),
    must(dispatch(fetchWards())),
    must(dispatch(fetchPreRequests())),
    must(dispatch(fetchDoctors())),
    soft(dispatch(fetchLedgers())),
    must(dispatch(fetchServices())),
  ]);
}

/** FA ledger view: the billing overview. */
export const loadFaOverview = createLoader('faOverview', async (_arg, { dispatch }) => {
  await fetchBillingOverview(dispatch);
});

/** FA charges view: the overview, pending leaders, and every ledger's entries. */
export const loadFaCharges = createLoader('faCharges', async (_arg, { dispatch, getState }) => {
  await Promise.all([fetchBillingOverview(dispatch), soft(dispatch(fetchLeaders()))]);
  const { rows } = selectBillingOverview(getState());
  await Promise.all(
    rows.filter((r) => r.ledger).map((r) => soft(dispatch(fetchLedgerEntries(r.ledger.ledger_id)))),
  );
});

/** One ledger's entries (no ledger means nothing to load). */
export const loadFaLedgerEntries = createLoader('faLedgerEntries', async (ledgerId, { dispatch }) => {
  if (!ledgerId) return;
  await soft(dispatch(fetchLedgerEntries(ledgerId)));
});

/** The receipts register. */
export const loadFaReceipts = createLoader('faReceipts', async (_arg, { dispatch }) => {
  await soft(dispatch(fetchReceipts()));
});

/** Settlement for one admission: its ledger entries and the patient's insurance, each tolerant of failure. */
export const loadFaSettlement = createLoader('faSettlement', async ({ ledgerId, patientId }, { dispatch }) => {
  await Promise.all([
    ledgerId ? soft(dispatch(fetchLedgerEntries(ledgerId))) : undefined,
    soft(dispatch(fetchPatientInsurance(patientId))),
  ]);
});

export { must, soft };
