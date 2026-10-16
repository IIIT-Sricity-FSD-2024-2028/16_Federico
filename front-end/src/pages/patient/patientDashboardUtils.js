'use strict';

/**
 * The pure helpers patient-dashboard.js declared inside its DOMContentLoaded
 * closure, plus the "latest past appointment" derivation the summary cards and
 * the last-visit card each computed separately (identically). The badge
 * components are in patientDashboardHelpers.jsx.
 */

export function getEffectiveStatus(bill) {
  if (bill.status === 'paid') return 'paid';
  const today = new Date().toISOString().split('T')[0];
  return bill.dueDateISO < today ? 'overdue' : 'pending';
}

/** Visits whose date is in the past. */
export function pastVisits(visits) {
  const now = Date.now();
  return visits.filter((item) => {
    const ts = new Date(item.isoDate || '').getTime();
    return Number.isFinite(ts) && ts < now;
  });
}

/** The most recent appointment that has already happened, or null. */
export function latestPastAppointment(appointments) {
  const now = Date.now();
  return (
    appointments
      .filter((item) => item && item.displayDate)
      .sort((left, right) => {
        const l = new Date((left.date || '') + ' ' + (left.time || '')).getTime();
        const r = new Date((right.date || '') + ' ' + (right.time || '')).getTime();
        return r - l;
      })
      .find((item) => {
        const ts = new Date((item.date || '') + ' ' + (item.time || '')).getTime();
        return Number.isFinite(ts) && ts < now;
      }) || null
  );
}
