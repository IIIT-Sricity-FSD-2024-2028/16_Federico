'use strict';

/**
 * PRE/js/shared-state.js — Shared helpers and data joins for PRE operations.
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

  function to12Hour(timeStr) {
    if (!timeStr) return '';
    const clean = String(timeStr).trim();
    if (/AM|PM/i.test(clean)) return clean;
    const parts = clean.split(':');
    if (parts.length < 2) return clean;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (Number.isNaN(hours)) return clean;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedHours = hours < 10 ? '0' + hours : String(hours);
    return `${formattedHours}:${minutes} ${suffix}`;
  }

  function to24Hour(timeStr) {
    if (!timeStr) return '';
    const clean = String(timeStr).trim();
    if (!/AM|PM/i.test(clean)) {
      const parts = clean.split(':');
      if (parts.length >= 2) {
        const hh = parts[0].padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        return `${hh}:${mm}`;
      }
      return clean;
    }
    const match = clean.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return clean;
    let hours = parseInt(match[1], 10);
    const minutes = match[2].padStart(2, '0');
    const meridian = match[3].toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
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

  function joinPreRequestsWithPatients(requests, patients, doctors) {
    const patientsById = {};
    (patients || []).forEach((p) => {
      patientsById[p.patient_id] = p;
    });

    const doctorsById = {};
    if (Array.isArray(doctors)) {
      doctors.forEach((d) => {
        doctorsById[d.doctor_id] = d;
      });
    } else if (doctors && typeof doctors === 'object') {
      Object.assign(doctorsById, doctors);
    }

    return (requests || []).map((r) => {
      const patient = patientsById[r.patient_id] || {};
      const doctor = r.doctor_id ? doctorsById[r.doctor_id] : null;

      const pName = patient.name || r.patient_name || r.patientName || 'Unknown Patient';
      const pUhid = patient.uhid || r.uhid || r.patientUhid || '—';
      const pAge = patient.dob ? formatAge(patient.dob) : r.patientAge || '—';
      const pGender = patient.gender || r.patientGender || '—';
      const pPhone = patient.phone || r.patientPhone || '—';
      const pBlood = patient.blood_group || r.patientBloodGroup || '—';
      const dName = doctor ? doctor.name : r.doctor_name || r.doctorName || '—';
      const dSpec = doctor ? doctor.specialization : r.doctor_specialization || '—';
      const dAvail = doctor ? doctor.available : Boolean(r.doctor_available);

      return {
        ...r,
        patient_name: pName,
        patientName: pName,
        patient_uhid: pUhid,
        patientUhid: pUhid,
        patient_age: pAge,
        patientAge: pAge,
        patient_gender: pGender,
        patientGender: pGender,
        patient_phone: pPhone,
        patientPhone: pPhone,
        patient_blood_group: pBlood,
        patientBloodGroup: pBlood,
        doctor_name: dName,
        doctorName: dName,
        doctor_specialization: dSpec,
        doctorSpecialization: dSpec,
        doctor_available: dAvail,
        department: r.department || (doctor ? doctor.specialization : 'General'),
      };
    });
  }

  const helperObject = Object.freeze({
    STATUS_LABELS,
    statusLabel,
    escapeHtml,
    formatAge,
    formatDate,
    hasValue,
    to12Hour,
    to24Hour,
    inferWardType,
    sortDoctorsForDepartment,
    joinPreRequestsWithPatients,
    joinRequestsWithPatients: joinPreRequestsWithPatients,
  });

  window.PRESharedState = helperObject;
  window.PREHelpers = helperObject;
})();

