/**
 * shared/formatters.js
 *
 * A handful of tiny, pure formatting helpers were independently copy-
 * pasted, byte-for-byte identical, across the per-role helper files:
 * escapeHtml (HOM/hom-helpers.js, FA/js/fa-helpers.js, PRE/js/shared-
 * state.js), formatCurrency (same 3 files), formatDate and formatAge
 * (HOM/hom-helpers.js, PRE/js/shared-state.js). `shared/` already exists
 * and is used for other cross-role code (constants.js, api-client.js,
 * rbac.js) — this closes the one place that convention wasn't followed.
 * Each role's own helper file now delegates to these instead of
 * redefining them, so a formatting change (currency symbol, locale,
 * escaping rules) only has to be made once.
 */
(function () {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    return 'Rs ' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

  window.Formatters = { escapeHtml, formatCurrency, formatDate, formatAge };
})();
