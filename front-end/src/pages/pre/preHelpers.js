'use strict';

import { escapeHtml, formatAge, formatDate } from '../../lib/formatters.js';
import { DEFAULT_DEPARTMENTS } from '../../lib/constants.js';

/** Ported verbatim from PRE/js/shared-state.js (window.PRESharedState / window.PREHelpers). */

export const STATUS_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CONSULTATION_DONE: 'Completed',
  CRITICAL: 'Critical',
  ADMITTED: 'Admitted',
  DISCHARGE_REQUESTED: 'Discharge Pending',
  DISCHARGE_APPROVED: 'Approved Discharge',
  DISCHARGED: 'Discharged',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '-';
}

export function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

/** "14:30" -> "02:30 PM". Already-formatted values pass through untouched. */
export function to12Hour(timeStr) {
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
  return formattedHours + ':' + minutes + ' ' + suffix;
}

/** "02:30 PM" -> "14:30", for binding into <input type="time">. */
export function to24Hour(timeStr) {
  if (!timeStr) return '';
  const clean = String(timeStr).trim();
  if (!/AM|PM/i.test(clean)) {
    const parts = clean.split(':');
    if (parts.length >= 2) return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
    return clean;
  }
  const match = clean.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return clean;
  let hours = parseInt(match[1], 10);
  const minutes = match[2].padStart(2, '0');
  const meridian = match[3].toUpperCase();
  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;
  return String(hours).padStart(2, '0') + ':' + minutes;
}

export function inferWardType(department) {
  const key = String(department || '').toLowerCase();
  const match = DEFAULT_DEPARTMENTS.find(
    (d) => key.includes(d.department.toLowerCase()) || d.department.toLowerCase().includes(key),
  );
  return match ? match.wardName : 'General Ward';
}

/** Ranks doctors by specialization match (10) then availability (5). */
export function sortDoctorsForDepartment(doctors, department) {
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

/**
 * Joins pre-requests to patients and doctors.
 *
 * Enriches each pre-request with canonical view properties (patientName,
 * patientUhid, patientAge, doctorName, etc.) resolved directly from
 * Table 10 (patients) and Table 12 (doctors).
 */
export function joinPreRequestsWithPatients(requests, patients, doctors) {
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

    const patientName = patient.name || 'Unknown Patient';
    const patientUhid = patient.uhid || '—';
    const patientAge = patient.dob ? formatAge(patient.dob) : '—';
    const patientGender = patient.gender || '—';
    const patientPhone = patient.phone || '—';
    const patientBloodGroup = patient.blood_group || '—';
    const doctorName = doctor ? doctor.name : '—';
    const doctorSpecialization = doctor ? doctor.specialization : '—';
    const doctorAvailable = doctor ? doctor.available : Boolean(r.doctor_available);

    return {
      ...r,
      patientName,
      patientUhid,
      patientAge,
      patientGender,
      patientPhone,
      patientBloodGroup,
      doctorName,
      doctorSpecialization,
      doctor_available: doctorAvailable,
      department: r.department || (doctor ? doctor.specialization : 'General'),
    };
  });
}

export { escapeHtml, formatAge, formatDate };

