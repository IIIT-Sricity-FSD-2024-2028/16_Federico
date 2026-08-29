'use strict';

/**
 * FA/js/fa-helpers.js — Finance Associate billing query and formatting helpers.
 */
(function () {
  const { escapeHtml, formatCurrency } = window.Formatters || {
    escapeHtml: (s) => String(s ?? ''),
    formatCurrency: (n) => 'Rs ' + (Number(n) || 0),
  };

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function loadBillingOverview() {
    const api = window.API || window.ApiClient;
    const [admissions, patients, beds, wards, preRequests, doctors, ledgers, services] = await Promise.all([
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
      const preRequest = (preRequests || []).find((r) => r.patient_id === admission.patient_id && r.bed_id === admission.bed_id) || null;
      const doctor = preRequest?.doctor_id ? doctorsById[preRequest.doctor_id] : null;
      const ledger = ledgersByAdmission[admission.admission_id] || null;

      return {
        admission,
        patient,
        bed,
        wardName: ward ? ward.ward_name : bed.bed_number ? '-' : '-',
        department: preRequest?.department || '-',
        doctorName: doctor ? doctor.name : '-',
        preRequest,
        ledger,
        dischargeApproved: preRequest?.status === 'DISCHARGE_APPROVED',
      };
    });

    return { rows, patientsById, bedsById, doctorsById, servicesById, admissionsById, admissions, patients };
  }

  async function loadLedgerEntries(ledgerId) {
    if (!ledgerId) return [];
    const api = window.API || window.ApiClient;
    return api.billing.ledger.entries(ledgerId).catch(() => []);
  }

  function ledgerTotal(entries) {
    return (entries || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }

  window.FAHelpers = Object.freeze({
    escapeHtml,
    formatCurrency,
    formatDateTime,
    loadBillingOverview,
    loadLedgerEntries,
    ledgerTotal,
  });
})();
