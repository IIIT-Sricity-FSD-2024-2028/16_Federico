'use strict';

/**
 * PRE/js/shared-state.js — Shared helpers and joins for PRE operations.
 */
(function () {
  const STATUS_LABELS = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CONSULTATION_DONE: 'Completed',
    EMERGENCY: 'Emergency',
    ADMITTED: 'Admitted',
    DISCHARGE_REQUESTED: 'Discharge Pending',
    DISCHARGE_APPROVED: 'Approved Discharge',
    DISCHARGED: 'Discharged',
  };

  function statusLabel(status) {
    return STATUS_LABELS[status] || status || '-';
  }

  const { escapeHtml, formatAge, formatDate } = window.Formatters || {
    escapeHtml: (s) => String(s ?? ''),
    formatAge: () => '-',
    formatDate: (d) => String(d || '-'),
  };

  function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  function inferWardType(department) {
    const key = String(department || '').toLowerCase();
    const defaults = (window.HospitalConstants && window.HospitalConstants.DEFAULT_DEPARTMENTS) || [];
    const match = defaults.find(
      (d) => key.includes(d.department.toLowerCase()) || d.department.toLowerCase().includes(key),
    );
    return match ? match.wardName : 'General Ward';
  }

  function sortDoctorsForDepartment(doctors, department) {
    const departmentKey = String(department || '').toLowerCase();
    const scored = (doctors || []).map((doctor) => {
      const spec = String(doctor.specialization || '').toLowerCase();
      const matchScore = departmentKey && spec.includes(departmentKey) ? 10 : 0;
      const availabilityScore = doctor.available ? 5 : 0;
      return { doctor, score: matchScore + availabilityScore };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map((item) => item.doctor);
  }

  function joinRequestsWithPatients(requests, patients, doctors) {
    const patientsById = {};
    (patients || []).forEach((p) => {
      patientsById[p.patient_id] = p;
    });

    const doctorsById = {};
    (doctors || []).forEach((d) => {
      doctorsById[d.doctor_id] = d;
    });

    return (requests || []).map((r) => {
      const patient = patientsById[r.patient_id] || {};
      const doctor = r.doctor_id ? doctorsById[r.doctor_id] : null;

      return {
        ...r,
        patient_name: patient.name || r.patient_name || 'Unknown Patient',
        patient_uhid: patient.uhid || r.uhid || '—',
        patient_age: patient.dob ? formatAge(patient.dob) : '—',
        patient_gender: patient.gender || '—',
        patient_phone: patient.phone || '—',
        patient_blood_group: patient.blood_group || '—',
        doctor_name: doctor ? doctor.name : r.doctor_name || '—',
        doctor_specialization: doctor ? doctor.specialization : '—',
        doctor_available: doctor ? doctor.available : false,
      };
    });
  }

  window.PRESharedState = Object.freeze({
    STATUS_LABELS,
    statusLabel,
    escapeHtml,
    formatAge,
    formatDate,
    hasValue,
    inferWardType,
    sortDoctorsForDepartment,
    joinRequestsWithPatients,
  });
})();
