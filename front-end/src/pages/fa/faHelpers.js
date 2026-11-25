'use strict';

import { createSelector } from '@reduxjs/toolkit';
import { orElse } from '../../store/loaders.js';
import { fetchAdmissions } from '../../store/slices/admissionsSlice.js';
import { fetchPatients } from '../../store/slices/patientsSlice.js';
import { fetchBeds, fetchWards } from '../../store/slices/wardsSlice.js';
import { fetchPreRequests } from '../../store/slices/preRequestsSlice.js';
import { fetchDoctors } from '../../store/slices/doctorsSlice.js';
import { fetchLedgerEntries, fetchLedgers, fetchServices } from '../../store/slices/billingSlice.js';
import { escapeHtml, formatCurrency } from '../../lib/formatters.js';

/**
 * Ported from FA/js/fa-helpers.js.
 *
 * escapeHtml and formatCurrency come straight from lib/formatters.js, same as
 * the legacy file pulled them off window.Formatters. escapeHtml survives only
 * because the print documents still build HTML strings; nothing in the views
 * needs it any more.
 */
export { escapeHtml, formatCurrency };

export function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The FA portal's one join: a row per admission built from eight collections.
 * Ported unchanged, including the loose `preRequest` match (same patient, and
 * either the same bed or no bed on the admission) and the `dischargeApproved`
 * derivation that treats every OPD visit as pre-approved.
 *
 * It is pure - the collections come from Redux (see selectBillingOverview) or,
 * inside an action that needs fresh data, from the fetch thunks' payloads.
 */
export function buildBillingOverview({ admissions, patients, beds, wards, preRequests, doctors, ledgers, services }) {
  const patientsById = {};
  (patients || []).forEach((p) => (patientsById[p.patient_id] = p));
  const bedsById = {};
  (beds || []).forEach((b) => (bedsById[b.bed_id] = b));
  const wardsById = {};
  (wards || []).forEach((w) => (wardsById[w.ward_id] = w));
  const doctorsById = {};
  (doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));
  const ledgersByAdmission = {};
  (ledgers || []).forEach((l) => (ledgersByAdmission[l.admission_id] = l));
  const servicesById = {};
  (services || []).forEach((s) => (servicesById[s.service_id] = s));
  const admissionsById = {};
  (admissions || []).forEach((a) => (admissionsById[a.admission_id] = a));

  const rows = (admissions || []).map((admission) => {
    const patient = patientsById[admission.patient_id] || {};
    const bed = bedsById[admission.bed_id] || {};
    const ward = wardsById[bed.ward_id];
    const preRequest =
      (preRequests || []).find(
        (r) =>
          r.patient_id === admission.patient_id &&
          (r.bed_id === admission.bed_id || !admission.bed_id),
      ) || null;
    const doctorId = preRequest?.doctor_id;
    const doctor = doctorId ? doctorsById[doctorId] : null;
    const ledger = ledgersByAdmission[admission.admission_id] || null;

    return {
      admission,
      patient,
      bed,
      wardName: ward
        ? ward.ward_name
        : admission.visit_type === 'OPD'
          ? 'OPD / Consultation'
          : '-',
      department: preRequest?.department || 'General',
      doctorName: doctor ? doctor.name : '-',
      preRequest,
      ledger,
      dischargeApproved:
        preRequest?.status === 'DISCHARGE_APPROVED' || admission.visit_type === 'OPD',
    };
  });

  return { rows, patientsById, bedsById, doctorsById, servicesById, admissionsById, admissions, patients };
}

/** The overview, derived (and memoized) from the slices the FA loader fills. */
export const selectBillingOverview = createSelector(
  [
    (state) => state.admissions.items,
    (state) => state.patients.items,
    (state) => state.wards.beds,
    (state) => state.wards.items,
    (state) => state.preRequests.items,
    (state) => state.doctors.items,
    (state) => state.billing.ledgers,
    (state) => state.billing.services,
  ],
  (admissions, patients, beds, wards, preRequests, doctors, ledgers, services) =>
    buildBillingOverview({ admissions, patients, beds, wards, preRequests, doctors, ledgers, services }),
);

/**
 * For actions that need the freshest data: fetches the same eight collections
 * through their slices' thunks (the ledger list tolerating failure, as before)
 * and joins the results.
 */
export async function loadBillingOverview(dispatch) {
  const [admissions, patients, beds, wards, preRequests, doctors, ledgers, services] = await Promise.all([
    dispatch(fetchAdmissions()).unwrap(),
    dispatch(fetchPatients()).unwrap(),
    dispatch(fetchBeds()).unwrap(),
    dispatch(fetchWards()).unwrap(),
    dispatch(fetchPreRequests()).unwrap(),
    dispatch(fetchDoctors()).unwrap(),
    orElse(dispatch(fetchLedgers()), []),
    dispatch(fetchServices()).unwrap(),
  ]);
  return buildBillingOverview({ admissions, patients, beds, wards, preRequests, doctors, ledgers, services });
}

/** A ledger's entries, or [] when there is no ledger or the fetch fails. */
export async function loadLedgerEntries(dispatch, ledgerId) {
  if (!ledgerId) return [];
  const result = await orElse(dispatch(fetchLedgerEntries(ledgerId)), null);
  return result ? result.entries : [];
}

/**
 * The Charges table: HOM's pending (staged) charges on top, then the entries
 * already approved into the ledgers, newest first. Derived from the overview,
 * the leaders list and the per-ledger entries held in billingSlice.
 */
export function buildCharges(overview, leaders, ledgerEntries) {
  const { rows, servicesById, patientsById, admissionsById } = overview;

  // Pending items submitted by HOM (not yet approved into ledger)
  const pendingItems = (leaders || [])
    .filter((l) => l.status === 'PENDING')
    .map((l) => {
      const admission = admissionsById[l.admission_id];
      const patient = l.patient_id
        ? patientsById[l.patient_id]
        : admission
          ? patientsById[admission.patient_id]
          : null;
      const service = servicesById[l.service_id];
      return {
        id: 'pending-' + l.leader_id,
        leaderId: l.leader_id,
        isPending: true,
        patientId: patient?.patient_id || l.patient_id || '-',
        patientName: patient?.name || 'Patient',
        uhid: patient?.uhid || '-',
        serviceName: service?.service_name || 'Service #' + l.service_id,
        quantity: l.quantity,
        amount: l.amount,
        status: 'Pending',
        time: new Date(l.created_at || Date.now()),
      };
    });

  // Recent ledger entries approved in FA ledger
  const withLedgers = rows.filter((r) => r.ledger);
  const recentLedgerItems = withLedgers.flatMap((r) =>
    (ledgerEntries[r.ledger.ledger_id] || []).map((e) => ({
      id: 'entry-' + r.ledger.ledger_id + '-' + e.entry_id,
      isPending: false,
      patientId: r.patient.patient_id || '-',
      patientName: r.patient.name,
      uhid: r.patient.uhid,
      serviceName: servicesById[e.service_id]?.service_name || 'Service #' + e.service_id,
      quantity: e.quantity,
      amount: e.amount,
      status: 'Approved',
      time: new Date(e.entry_time || Date.now()),
    })),
  );

  // Pending items at the top, then recent approved ledger items by time desc
  const allCharges = [...pendingItems, ...recentLedgerItems].sort(
    (a, b) => (b.isPending ? 1 : 0) - (a.isPending ? 1 : 0) || b.time - a.time,
  );

  return { pendingItems, allCharges };
}

export function ledgerTotal(entries) {
  return (entries || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

/**
 * Selects an admission for the current view's detail section and scrolls that
 * section into view. The queues and the detail now share a view, so picking a
 * patient no longer switches views.
 */
export function selectAndReveal(ctx, route, admissionId, sectionId) {
  ctx.setCurrentAdmissionId(admissionId);
  ctx.navigate(route, admissionId);
  requestAnimationFrame(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

