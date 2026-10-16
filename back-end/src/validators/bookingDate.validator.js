'use strict';

const env = require('../config/env');

/**
 * Normalizes any ISO date string or timestamp to 'YYYY-MM-DD'.
 */
function extractDatePart(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Returns UTC bounds { minDate, maxDate, maxDays, minDays } based on baseDate or today.
 */
function getBookingDateBounds(
  baseDate = null,
  maxDays = env.MAX_ADVANCE_BOOKING_DAYS,
  minDays = env.MIN_ADVANCE_BOOKING_DAYS,
) {
  const base = extractDatePart(baseDate) || new Date().toISOString().split('T')[0];
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
 * Validates whether a booking date falls within the allowable advance window.
 * Returns { valid: true, date } or { valid: false, message }.
 */
function validateBookingDate(
  dateInput,
  maxDays = env.MAX_ADVANCE_BOOKING_DAYS,
  baseDate = null,
) {
  const dateStr = extractDatePart(dateInput);
  if (!dateStr) {
    return { valid: false, message: 'Invalid appointment date format' };
  }

  const { minDate, maxDate, maxDays: horizonDays } = getBookingDateBounds(baseDate, maxDays);

  if (dateStr < minDate) {
    return { valid: false, message: 'Appointment date cannot be in the past' };
  }

  if (dateStr > maxDate) {
    return {
      valid: false,
      message: `Appointment date cannot be scheduled more than ${horizonDays} days in advance`,
    };
  }

  return { valid: true, date: dateStr };
}

module.exports = {
  extractDatePart,
  getBookingDateBounds,
  validateBookingDate,
};
