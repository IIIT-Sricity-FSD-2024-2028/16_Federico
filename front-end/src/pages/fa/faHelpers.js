'use strict';

import { api } from '../../api/index.js';
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
 * The FA portal's one data load: eight endpoints in parallel, joined into a row
 * per admission. Ported unchanged, including the loose `preRequest` match
 * (same patient, and either the same bed or no bed on the admission) and the
 * `dischargeApproved` derivation that treats every OPD visit as pre-approved.
 */
export async function loadBillingOverview() {
  const [admissions, patients, beds, wards, preRequests, doctors, ledgers, services] =
    await Promise.all([
      api.admissions.list(),
      api.patients.list(),
      api.wards.beds(),
      api.wards.list(),
      api.preRequests.list(),
      api.doctors.list(),
      api.billing.ledger.listAll().catch(() => []),
      api.billing.services.list(),
    ]);

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

export async function loadLedgerEntries(ledgerId) {
  if (!ledgerId) return [];
  return api.billing.ledger.entries(ledgerId).catch(() => []);
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

