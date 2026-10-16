'use strict';

/** Mirrors the backend caps (fileUpload.js): 5 MB, pdf/jpg/jpeg/png only. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];

/**
 * Appointment advance booking horizon constraints (mirrors backend env):
 * Patient appointments can only be booked from today up to MAX_ADVANCE_BOOKING_DAYS in advance.
 */
export const MAX_ADVANCE_BOOKING_DAYS = 14;
export const MIN_ADVANCE_BOOKING_DAYS = 0;

/**
 * Returns UTC-based date strings { minDate, maxDate, maxDays, minDays } formatted as YYYY-MM-DD.
 */
export function getBookingDateBounds(
  baseIsoDate = null,
  maxDays = MAX_ADVANCE_BOOKING_DAYS,
  minDays = MIN_ADVANCE_BOOKING_DAYS,
) {
  const base = baseIsoDate || new Date().toISOString().split('T')[0];
  const [year, month, day] = base.split('-').map(Number);

  const min = new Date(Date.UTC(year, month - 1, day));
  min.setUTCDate(min.getUTCDate() + minDays);
  const minDate = min.toISOString().split('T')[0];

  const max = new Date(Date.UTC(year, month - 1, day));
  max.setUTCDate(max.getUTCDate() + maxDays);
  const maxDate = max.toISOString().split('T')[0];

  return { minDate, maxDate, maxDays, minDays };
}

/**
 * Validates a user-selected date against the allowed booking horizon bounds.
 * Returns an error message string or null if valid.
 */
export function validateBookingDateString(dateIso, bounds) {
  if (!dateIso) return 'Please select a preferred date.';
  if (bounds && bounds.minDate && dateIso < bounds.minDate) {
    return 'Please choose today or a future date.';
  }
  if (bounds && bounds.maxDate && dateIso > bounds.maxDate) {
    return `Appointments cannot be scheduled more than ${bounds.maxDays} days in advance.`;
  }
  return null;
}

/**
 * Standard doctor duty roster (mirrors back-end doctor.service.js): Monday to
 * Friday, 09:00 - 17:00. A preferred time outside it can never be confirmed by
 * PRE for a doctor without explicit calendar rows, so the form rejects it.
 */
export const DUTY_START = '09:00';
export const DUTY_END = '17:00';
export const DUTY_HOURS_LABEL = 'Monday – Friday, 09:00 AM – 05:00 PM';

/** Quick picks that pre-fill the time input. */
export const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning (09:00 AM – 12:00 PM)', start: '09:00', end: '12:00', pick: '10:00' },
  { id: 'afternoon', label: 'Afternoon (12:00 PM – 05:00 PM)', start: '12:00', end: '17:00', pick: '14:00' },
];

/** The window a 24-hour "HH:MM" falls in, or '' when outside duty hours. */
export function windowFor(time24) {
  const match = TIME_WINDOWS.find((w) => time24 >= w.start && time24 < w.end);
  return match ? match.id : '';
}

/**
 * Why a preferred date + 24-hour time can't be booked, or null if it can.
 * Dates are compared as plain YYYY-MM-DD strings, so no timezone shifts.
 */
export function dutyHoursError(dateIso, time24) {
  const day = new Date(dateIso + 'T00:00:00').getDay();
  if (day === 0 || day === 6) {
    return 'Doctors are on duty ' + DUTY_HOURS_LABEL + '. Please choose a weekday.';
  }
  if (time24 < DUTY_START || time24 >= DUTY_END) {
    return 'Please choose a time between 09:00 AM and 05:00 PM.';
  }
  return null;
}

/** Standardises e.g. "9:00 AM" or "14:30" -> "09:00 AM" / "02:30 PM". */
export function normalizeSlotTime(t) {
  if (!t) return '';
  const clean = t.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const min = match[2];
    const ampm = match[3] || (hour >= 12 ? 'PM' : 'AM');
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return String(hour).padStart(2, '0') + ':' + min + ' ' + ampm;
  }
  return clean;
}

/** The page's own date formatter - not lib/formatters.js#formatDate. */
export function formatSlotDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
