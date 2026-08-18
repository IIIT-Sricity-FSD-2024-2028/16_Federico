/**
 * HOM/hom-helpers.js — Phase 3 rewrite.
 *
 * Replaces storage.js (a ~1000-line localStorage state manager that kept
 * its own parallel copies of admissions/billing/wards/inventory) with
 * small, pure formatting/join helpers. There is no more client-side
 * "state" — every HOM page fetches fresh from window.ApiClient on load
 * and after each action, same pattern as the PRE and Patient rewrites.
 */
(function () {
  const STATUS_LABELS = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CONSULTATION_DONE: 'Completed',
    EMERGENCY: 'Emergency',
    ADMITTED: 'Admitted',
    DISCHARGE_REQUESTED: 'Discharge Requested',
    DISCHARGE_APPROVED: 'Discharge Approved',
    DISCHARGED: 'Discharged',
  };

  function statusLabel(status) {
    return STATUS_LABELS[status] || status || '-';
  }

  function statusVariant(status) {
    switch (status) {
      case 'ADMITTED':
        return 'warning';
      case 'DISCHARGE_REQUESTED':
        return 'warning';
      case 'DISCHARGE_APPROVED':
        return 'info';
      case 'DISCHARGED':
        return 'success';
      default:
        return 'neutral';
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    return 'Rs ' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function formatAge(dob) {
    if (!dob) return '-';
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
    return String(Math.max(age, 0));
  }

  function daysSince(value) {
    if (!value) return 0;
    const start = new Date(value);
    if (Number.isNaN(start.getTime())) return 0;
    const diff = Date.now() - start.getTime();
    return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
  }

  /**
   * preRequests are properly normalized (patient_id FK only). Every HOM
   * page that needs patient/doctor context on a pre-request joins here
   * once instead of reimplementing it per page. Field names deliberately
   * match PRE/js/shared-state.js's version of this same join.
   */
  function joinPreRequestsWithPatients(preRequests, patients, doctorsById) {
    const patientsById = {};
    patients.forEach((p) => {
      patientsById[p.patient_id] = p;
    });

    return preRequests.map((request) => {
      const patient = patientsById[request.patient_id] || {};
      const doctor = request.doctor_id ? doctorsById?.[request.doctor_id] : null;
      return {
        ...request,
        patientUhid: patient.uhid || '-',
        patientName: patient.name || '-',
        patientAge: formatAge(patient.dob),
        patientGender: patient.gender || '-',
        patientPhone: patient.phone || '-',
        patientBloodGroup: patient.blood_group || '-',
        doctorName: doctor ? doctor.name : '-',
      };
    });
  }

  const BED_STYLES = {
    AVAILABLE: { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', label: 'Available' },
    OCCUPIED: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Occupied' },
    MAINTENANCE: { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569', label: 'Maintenance' },
  };

  function bedStyle(status) {
    return BED_STYLES[status] || { bg: '#ffffff', border: '#E2E8F0', text: '#1E293B', label: status || 'Unknown' };
  }

  /**
   * closeModals() — the ONE shared modal-dismiss helper for HOM.
   * Previously redefined identically (same `.modal-overlay` query/loop)
   * in both beds.js and patient-flow.js. Each of those files' extra
   * per-page state resets (currentDetailBedId, selectedRequestId, etc.)
   * were already redundant — every open*Modal() function in those files
   * re-initializes its own state at the top before showing the modal —
   * so consolidating the shared DOM-hiding logic here changes no
   * observable behavior. Exposed as a bare global (not just under
   * HOMHelpers) because every screen's modal markup calls it directly via
   * `onclick="closeModals()"`.
   */
  function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.remove('active'));
  }

  window.HOMHelpers = {
    statusLabel,
    statusVariant,
    escapeHtml,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatAge,
    daysSince,
    joinPreRequestsWithPatients,
    bedStyle,
    closeModals,
  };
  window.closeModals = closeModals;
})();
