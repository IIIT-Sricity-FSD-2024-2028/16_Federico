/**
 * shared/department-options.js
 *
 * The appointment-booking department dropdown used to be two separate,
 * hardcoded <option> lists — PRE/pages/APPointment.html and
 * Patient/patient-book-appointment.html — that didn't even agree with
 * each other ("Orthopedic" vs "Orthopedics", "General" vs "General
 * Medicine"). Both now call this once, populating the dropdown from the
 * hospital's actual doctors (their `specialization` field, already
 * fetched via `ApiClient.doctors.list()` elsewhere in the app) instead of
 * a static guess-list — this always matches who a patient can actually
 * be scheduled with, and can never drift out of sync with itself.
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

  function populateDepartmentSelect(selectEl, doctors, options) {
    if (!selectEl) return;
    const settings = options || {};
    const placeholder = settings.placeholder || 'Select department';
    const previousValue = selectEl.value;

    const specializations = Array.from(
      new Set((doctors || []).map((d) => (d.specialization || '').trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    const optionHtml = [`<option value="" disabled selected>${escapeHtml(placeholder)}</option>`]
      .concat(specializations.map((spec) => `<option value="${escapeHtml(spec)}">${escapeHtml(spec)}</option>`))
      .join('');
    selectEl.innerHTML = optionHtml;

    if (previousValue && specializations.includes(previousValue)) {
      selectEl.value = previousValue;
    }
  }

  window.DepartmentOptions = { populateDepartmentSelect };
})();
