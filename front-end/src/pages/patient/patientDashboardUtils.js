'use strict';

import { parseTimeToMinutes } from './patientStoreShape.js';

/**
 * Pure dashboard calculation utilities for appointment sorting, overdue status,
 * and encounter history derivation.
 */

export function getEffectiveStatus(bill) {
  if (!bill) return 'pending';
  if (bill.status === 'paid') return 'paid';
  const today = new Date().toISOString().split('T')[0];
  return bill.dueDateISO < today ? 'overdue' : 'pending';
}

/** Parses appointment date (YYYY-MM-DD) and time string into a millisecond timestamp. */
export function getAppointmentTimestamp(item) {
  if (!item) return 0;
  const timeMins = parseTimeToMinutes(item.time || '00:00');
  const [y, m, d] = String(item.date || '').split('-').map(Number);
  if (y && m && d) {
    return new Date(y, m - 1, d, Math.floor(timeMins / 60), timeMins % 60).getTime();
  }
  return new Date(item.date || '').getTime() || 0;
}

/** Returns visits whose date is strictly in the past. */
export function pastVisits(visits = []) {
  const now = Date.now();
  const list = Array.isArray(visits) ? visits : [];
  return list.filter((item) => {
    const ts = new Date(item?.isoDate || item?.date || '').getTime();
    return Number.isFinite(ts) && ts < now;
  });
}

/** Returns the most recent past appointment that has already concluded, or null. */
export function latestPastAppointment(appointments = []) {
  const now = Date.now();
  const list = Array.isArray(appointments) ? appointments : [];
  return (
    list
      .filter((item) => {
        if (!item || !item.displayDate) return false;
        const s = String(item.status || '').toLowerCase();
        const raw = String(item.rawStatus || '').toUpperCase();
        if (['cancelled', 'rejected'].includes(s) || ['CANCELLED', 'REJECTED'].includes(raw)) {
          return false;
        }
        const ts = getAppointmentTimestamp(item);
        return Number.isFinite(ts) && ts > 0 && ts < now;
      })
      .sort((a, b) => getAppointmentTimestamp(b) - getAppointmentTimestamp(a))[0] || null
  );
}

/**
 * Returns strictly upcoming appointments scheduled for today or in the future
 * with active status (excluding completed, cancelled, or rejected).
 * Sorted ascending chronologically so index 0 is the immediate next appointment.
 */
export function getUpcomingAppointments(appointments = [], now = Date.now()) {
  const list = Array.isArray(appointments) ? appointments : [];
  return list
    .filter((a) => {
      if (!a) return false;
      const s = String(a.status || '').toLowerCase();
      const raw = String(a.rawStatus || '').toUpperCase();
      if (
        ['cancelled', 'rejected', 'completed'].includes(s) ||
        ['CANCELLED', 'REJECTED', 'COMPLETED', 'CONSULTATION_DONE', 'DISCHARGED'].includes(raw)
      ) {
        return false;
      }
      const ts = getAppointmentTimestamp(a);
      return Number.isFinite(ts) && ts >= now;
    })
    .sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));
}

/**
 * Determines the patient's chronologically most recent concluded medical encounter
 * by evaluating both inpatient admissions and concluded outpatient consultations.
 */
export function getLatestConcludedEncounter(visits = [], appointments = [], now = Date.now()) {
  const pastStays = (Array.isArray(visits) ? visits : [])
    .map((v) => {
      const ts = new Date(v.isoDate || v.date || '').getTime();
      return {
        ts,
        date: v.isoDate || v.date,
        caption: v.description || 'Hospital Stay',
        isStay: true,
      };
    })
    .filter((v) => Number.isFinite(v.ts) && v.ts > 0 && v.ts < now);

  const pastConsultations = (Array.isArray(appointments) ? appointments : [])
    .filter((a) => {
      if (!a) return false;
      const s = String(a.status || '').toLowerCase();
      const raw = String(a.rawStatus || '').toUpperCase();
      if (['cancelled', 'rejected'].includes(s) || ['CANCELLED', 'REJECTED'].includes(raw)) {
        return false;
      }
      const ts = getAppointmentTimestamp(a);
      return Number.isFinite(ts) && ts > 0 && ts < now;
    })
    .map((a) => ({
      ts: getAppointmentTimestamp(a),
      date: a.date,
      caption: (a.department || 'Consultation') + ' appointment',
      isStay: false,
    }));

  const combined = [...pastStays, ...pastConsultations].sort((a, b) => b.ts - a.ts);
  return combined[0] || null;
}
