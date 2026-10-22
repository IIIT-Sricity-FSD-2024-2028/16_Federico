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
 * Standard doctor duty roster: Monday to Friday, 09:00 - 17:00.
 */
export const DUTY_START = '09:00';
export const DUTY_END = '17:00';
export const DUTY_HOURS_LABEL = 'Monday – Friday, 09:00 AM – 05:00 PM';

/** Quick picks that pre-fill the time input. */
export const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning (09:00 AM – 12:00 PM)', start: '09:00', end: '12:00', pick: '10:00' },
  { id: 'afternoon', label: 'Afternoon (12:00 PM – 05:00 PM)', start: '12:00', end: '17:00', pick: '14:00' },
];

/** Current time in 24-hour "HH:MM" format. */
export function getCurrentTime24() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Current local date formatted as YYYY-MM-DD. */
export function getLocalDateIso(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Minimum bookable time for a given ISO date (YYYY-MM-DD). */
export function getMinTimeForDate(dateIso, todayIso = getLocalDateIso()) {
  const dateOnly = String(dateIso || '').split('T')[0];
  if (dateOnly === todayIso) {
    const current = getCurrentTime24();
    return current > DUTY_START ? current : DUTY_START;
  }
  return DUTY_START;
}

/**
 * Returns UTC-based date strings { minDate, maxDate, maxDays, minDays } formatted as YYYY-MM-DD.
 */
export function getBookingDateBounds(
  baseIsoDate = null,
  maxDays = MAX_ADVANCE_BOOKING_DAYS,
  minDays = MIN_ADVANCE_BOOKING_DAYS,
) {
  const base = (baseIsoDate || new Date().toISOString().split('T')[0]).split('T')[0];
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
export function validateBookingDateString(dateIso, bounds, todayIso = getLocalDateIso()) {
  if (!dateIso) return 'Please select a preferred date.';
  const dateOnly = String(dateIso).split('T')[0];
  if (bounds && bounds.minDate && dateOnly < bounds.minDate) {
    return 'Please choose today or a future date.';
  }
  if (bounds && bounds.maxDate && dateOnly > bounds.maxDate) {
    return `Appointments cannot be scheduled more than ${bounds.maxDays} days in advance.`;
  }
  // If selected date is today, check if duty hours have already completely ended
  if (dateOnly === todayIso && getCurrentTime24() >= DUTY_END) {
    return 'Duty hours for today have closed (after 05:00 PM). Please select a future weekday.';
  }
  return null;
}

/** The window a 24-hour "HH:MM" falls in, or '' when outside duty hours. */
export function windowFor(time24) {
  const match = TIME_WINDOWS.find((w) => time24 >= w.start && time24 < w.end);
  return match ? match.id : '';
}

/**
 * Why a preferred date + 24-hour time can't be booked, or null if it can.
 * Validates duty hours (Mon-Fri 09:00-17:00) and ensures time hasn't already passed for today.
 */
export function dutyHoursError(dateIso, time24, todayIso = getLocalDateIso()) {
  const dateOnly = String(dateIso || '').split('T')[0];
  const day = new Date(dateOnly + 'T00:00:00').getDay();
  if (day === 0 || day === 6) {
    return 'Doctors are on duty ' + DUTY_HOURS_LABEL + '. Please choose a weekday.';
  }
  if (time24 < DUTY_START || time24 >= DUTY_END) {
    return 'Please choose a time between 09:00 AM and 05:00 PM.';
  }
  // If booking for today, time cannot be in the past
  if (dateOnly === todayIso) {
    const current = getCurrentTime24();
    if (time24 <= current) {
      return 'Please choose a future time (after current time).';
    }
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

/** Formats date strictly as DD-MM-YYYY. */
export function formatSlotDate(iso) {
  if (!iso) return '—';
  const clean = String(iso).includes('T') ? String(iso) : `${iso}T00:00:00`;
  const d = new Date(clean);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
