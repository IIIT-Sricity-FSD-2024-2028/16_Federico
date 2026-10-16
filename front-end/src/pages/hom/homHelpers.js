'use strict';

import { escapeHtml, formatCurrency, formatDate, formatAge, formatDateTime } from '../../lib/formatters.js';

/** Ported from HOM/hom-helpers.js. Pure helpers only; the modal plumbing moved to components/layout/Modal.jsx. */

const STATUS_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CONSULTATION_DONE: 'Completed',
  CRITICAL: 'Critical',
  ADMITTED: 'Admitted',
  DISCHARGE_REQUESTED: 'Discharge Requested',
  DISCHARGE_APPROVED: 'Discharge Approved',
  DISCHARGED: 'Discharged',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '-';
}

export function statusVariant(status) {
  switch (status) {
    case 'CRITICAL':
      return 'error';
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

export function daysSince(value) {
  if (!value) return 0;
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / (24 * 60 * 60 * 1000)));
}

/** Joins pre-requests to their patient (and doctor), flattening the fields the tables read. */
export function joinPreRequestsWithPatients(preRequests, patients, doctorsById) {
  const patientsById = {};
  (patients || []).forEach((p) => {
    patientsById[p.patient_id] = p;
  });

  return (preRequests || []).map((request) => {
    const patient = patientsById[request.patient_id] || {};
    const doctor = request.doctor_id ? doctorsById?.[request.doctor_id] : null;
    return {
      ...request,
      patientUhid: patient.uhid || '—',
      patientName: patient.name || 'Unknown Patient',
      patientAge: patient.dob ? formatAge(patient.dob) : '—',
      patientGender: patient.gender || '—',
      patientPhone: patient.phone || '—',
      patientBloodGroup: patient.blood_group || '—',
      doctorName: doctor ? doctor.name : '—',
      doctorSpecialization: doctor ? doctor.specialization : '—',
    };
  });
}

/** Bed tile colours, kept as the literal hex values the legacy file used. */
const BED_STYLES = {
  AVAILABLE: { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', label: 'Available' },
  OCCUPIED: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Occupied' },
  MAINTENANCE: { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569', label: 'Maintenance' },
};

export function bedStyle(status) {
  return BED_STYLES[status] || { bg: '#ffffff', border: '#E2E8F0', text: '#1E293B', label: status || 'Unknown' };
}

export { escapeHtml, formatCurrency, formatDate, formatAge, formatDateTime };

