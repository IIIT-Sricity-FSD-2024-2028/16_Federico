/**
 * shared/formatters.js
 *
 * Core pure formatting helpers for currency, date, age, and XSS string escaping.
 */
(function (root, factory) {
  'use strict';
  var exported = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.Formatters = exported;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /**
   * Safely escapes HTML special characters to prevent Cross-Site Scripting (XSS).
   * @param {any} value - Unsanitized input
   * @returns {string} - Escaped HTML string
   */
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Formats a numeric value as Indian Rupee (INR).
   * @param {number|string} amount
   * @returns {string} - e.g. "Rs 5,000"
   */
  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    return 'Rs ' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  /**
   * Formats an ISO date string or timestamp into a readable date.
   * @param {string|Date} value
   * @returns {string} - e.g. "15 Mar 2026"
   */
  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /**
   * Computes age in years from a date of birth.
   * @param {string|Date} dob
   * @returns {string}
   */
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

  return Object.freeze({
    escapeHtml: escapeHtml,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    formatAge: formatAge,
  });
});
