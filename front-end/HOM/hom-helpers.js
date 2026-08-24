'use strict';

/**
 * HOM/hom-helpers.js — Helper functions for Head of Medical workflows.
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

  const { escapeHtml, formatCurrency, formatDate, formatAge } = window.Formatters || {
    escapeHtml: (s) => String(s ?? ''),
    formatCurrency: (n) => 'Rs ' + (Number(n) || 0),
    formatDate: (d) => String(d || '-'),
    formatAge: () => '-',
  };

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function daysSince(value) {
    if (!value) return 0;
    const start = new Date(value);
    if (Number.isNaN(start.getTime())) return 0;
    const diff = Date.now() - start.getTime();
    return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
  }

  function joinPreRequestsWithPatients(preRequests, patients, doctorsById) {
    const patientsById = {};
    (patients || []).forEach((p) => {
      patientsById[p.patient_id] = p;
    });

    return (preRequests || []).map((request) => {
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

  function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.remove('active'));
  }

  window.HOMHelpers = Object.freeze({
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
  });
  window.closeModals = closeModals;
})();
