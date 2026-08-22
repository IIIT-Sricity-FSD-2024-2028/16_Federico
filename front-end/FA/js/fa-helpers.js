/**
 * FA/js/fa-helpers.js — Phase 3 rewrite.
 *
 * Replaces the old AppState/localStorage layer (mockData.js + state.js +
 * fa-storage.js — a synthetic in-memory billing model keyed by admission
 * id, with its own faLedgerRequests/dispatchQueue/paymentConfirmations
 * arrays simulating a HOM<->FA handshake that had no backend behind it)
 * with real reads against window.ApiClient, joined for the views that
 * need them. There is no more "AppState" — every page loads fresh data.
 *
 * Payment itself is NOT done here: the Patient's own billing page already
 * calls POST /billing/payments (which auto-generates the receipt and
 * marks the ledger PAID on the backend). FA's job is ledger setup,
 * charges, and dispatch — plus recording a manual cash payment for
 * walk-ins, which reuses that same endpoint.
 */
(function () {
  // escapeHtml/formatCurrency moved to shared/formatters.js (were
  // byte-identical copies duplicated across HOM/FA/PRE's own helper files).
  const { escapeHtml, formatCurrency } = window.Formatters;

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /**
   * The one shared "give me everything billing-relevant" fetch used by
   * every FA page. Admissions are the anchor (an admission only exists
   * once HOM has allocated a bed — see ward.controller.js#updateBedRequest)
   * joined with patient/bed/ward for display and the matching preRequest
   * for department/doctor/discharge-approval status.
   */
  async function loadBillingOverview() {
    const [admissions, patients, beds, wards, preRequests, doctors, ledgers, services] = await Promise.all([
      window.ApiClient.admissions.list(),
      window.ApiClient.patients.list(),
      window.ApiClient.wards.beds(),
      window.ApiClient.wards.list(),
      window.ApiClient.preRequests.list(),
      window.ApiClient.doctors.list(),
      window.ApiClient.billing.ledger.listAll().catch(() => []),
      window.ApiClient.billing.services.list(),
    ]);

    const patientsById = {};
    patients.forEach((p) => (patientsById[p.patient_id] = p));
    const bedsById = {};
    beds.forEach((b) => (bedsById[b.bed_id] = b));
    const wardsById = {};
    wards.forEach((w) => (wardsById[w.ward_id] = w));
    const doctorsById = {};
    doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
    const ledgersByAdmission = {};
    ledgers.forEach((l) => (ledgersByAdmission[l.admission_id] = l));
    const servicesById = {};
    services.forEach((s) => (servicesById[s.service_id] = s));

    const rows = admissions.map((admission) => {
      const patient = patientsById[admission.patient_id] || {};
      const bed = bedsById[admission.bed_id] || {};
      const ward = wardsById[bed.ward_id];
      const preRequest = preRequests.find((r) => r.patient_id === admission.patient_id && r.bed_id === admission.bed_id) || null;
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

    return { rows, patientsById, bedsById, doctorsById, servicesById, admissions, patients };
  }

  async function loadLedgerEntries(ledgerId) {
    if (!ledgerId) return [];
    return window.ApiClient.billing.ledger.entries(ledgerId).catch(() => []);
  }

  function ledgerTotal(entries) {
    return entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }

  window.FAHelpers = {
    escapeHtml,
    formatCurrency,
    formatDateTime,
    loadBillingOverview,
    loadLedgerEntries,
    ledgerTotal,
  };
})();
