'use strict';

/** Pure formatting helpers, ported verbatim from shared/formatters.js. */

/** Escapes HTML special characters. Still needed for the print-window documents. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** e.g. "Rs 5,000" */
export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return 'Rs ' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** e.g. "15 Mar 2026" */
export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Age in whole years from a date of birth. */
export function formatAge(dob) {
  if (!dob) return '-';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return String(Math.max(age, 0));
}

/** HOM/FA share this one; it is not in the legacy shared/formatters.js. */
export function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

