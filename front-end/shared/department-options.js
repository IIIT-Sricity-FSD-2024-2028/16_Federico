'use strict';

/**
 * shared/department-options.js
 *
 * Populates department dropdown selections dynamically from active doctor profiles.
 */
(function () {
  function escape(str) {
    if (window.Formatters && typeof window.Formatters.escapeHtml === 'function') {
      return window.Formatters.escapeHtml(str);
    }
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function populateDepartmentSelect(selectEl, doctors, options) {
    if (!selectEl) return;
    const settings = options || {};
    const placeholder = settings.placeholder || 'Select department';
    const previousValue = selectEl.value;

    const specializations = Array.from(
      new Set((doctors || []).map((d) => (d.specialization || '').trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    const optionHtml = [`<option value="" disabled selected>${escape(placeholder)}</option>`]
      .concat(specializations.map((spec) => `<option value="${escape(spec)}">${escape(spec)}</option>`))
      .join('');
    selectEl.innerHTML = optionHtml;

    if (previousValue && specializations.includes(previousValue)) {
      selectEl.value = previousValue;
    }
  }

  window.DepartmentOptions = Object.freeze({ populateDepartmentSelect });
})();
