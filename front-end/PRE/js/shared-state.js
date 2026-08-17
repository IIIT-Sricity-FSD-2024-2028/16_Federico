/**
 * PRE/js/shared-state.js — Phase 3 rewrite.
 *
 * The original version was a ~440-line localStorage state manager
 * (seeding/merging/migrating a shared blob). The backend is now the
 * source of truth, so this file's job shrinks to what it should always
 * have been: small cross-page helpers (status label mapping, doctor
 * availability lookups, age/ward-type inference) that sit on top of
 * `window.ApiClient` calls the pages make directly. There is no more
 * client-side "state" to hold — every PRE page fetches fresh from the
 * backend on load and after each action.
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

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
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

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const WARD_TYPE_BY_DEPARTMENT = [
    [/icu/i, 'ICU Ward'],
    [/emergency/i, 'Emergency Ward'],
    [/pediatric/i, 'Pediatric Ward'],
    [/maternity|obstetric|gyn/i, 'Maternity Ward'],
    [/surger|surgical|ortho/i, 'Surgical Ward'],
    [/card/i, 'Cardiac Care Ward'],
  ];

  function inferWardType(department) {
    const match = WARD_TYPE_BY_DEPARTMENT.find(([pattern]) => pattern.test(String(department || '')));
    return match ? match[1] : 'General Ward';
  }

  /** doctors whose specialization loosely matches the department, available ones first */
  function sortDoctorsForDepartment(doctors, department) {
    const departmentKey = String(department || '').toLowerCase();
    const scored = doctors.map((doctor) => {
      const spec = String(doctor.specialization || '').toLowerCase();
      const matches = departmentKey && spec && (spec.includes(departmentKey) || departmentKey.includes(spec));
      return { doctor, matches };
    });
    return [...scored.filter((s) => s.matches), ...scored.filter((s) => !s.matches)].map((s) => s.doctor);
  }

  function isDoctorAvailableAt(availability, timeValue) {
    if (!availability || !timeValue) return true;
    const toMinutes = (t) => {
      const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
      if (!m) return null;
      return Number(m[1]) * 60 + Number(m[2]);
    };
    const target = toMinutes(timeValue);
    const start = toMinutes(availability.start_time);
    const end = toMinutes(availability.end_time);
    if (target === null || start === null || end === null) return true;
    return target >= start && target <= end;
  }

  function to12Hour(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/am|pm/i.test(raw)) return raw;
    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return raw;
    let hours = Number(match[1]);
    const minutes = match[2];
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${meridiem}`;
  }

  function to24Hour(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{2}:\d{2}$/.test(raw)) return raw;
    const match = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) return '';
    let hours = Number(match[1]);
    const minutes = match[2];
    const meridiem = match[3].toUpperCase();
    if (meridiem === 'AM') hours = hours === 12 ? 0 : hours;
    else hours = hours === 12 ? 12 : hours + 12;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  /**
   * preRequests are properly normalized now (patient_id FK only, no
   * denormalized name/age/gender/phone the way the original frontend
   * stored them). Every PRE page needs the joined view, so it lives here
   * once instead of being reimplemented per page.
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
        patientAddress: patient.address || '-',
        doctorName: doctor ? doctor.name : '-',
      };
    });
  }

  window.PREHelpers = {
    statusLabel,
    escapeHtml,
    hasValue,
    formatAge,
    formatDate,
    inferWardType,
    sortDoctorsForDepartment,
    isDoctorAvailableAt,
    to12Hour,
    to24Hour,
    joinPreRequestsWithPatients,
  };
})();
