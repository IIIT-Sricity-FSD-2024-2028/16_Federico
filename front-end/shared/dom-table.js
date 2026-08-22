/**
 * shared/dom-table.js
 *
 * The "empty-state <tr> + rows.map(...).join('')" skeleton was
 * hand-rolled independently in every HOM table-rendering function
 * (billing.js#renderTable, inventory.js#renderTable, dashboard.js's
 * several renderX functions, patient-flow.js, beds.js) — same shape,
 * copy-pasted each time. One shared renderRows() replaces all of them.
 */
(function () {
  /**
   * @param {HTMLElement} tbody
   * @param {Array} items
   * @param {Object} options
   * @param {(item: any) => string} options.toRow - returns the `<tr>...</tr>` markup for one item
   * @param {string} options.emptyMessage - shown in a single spanning cell when items is empty
   * @param {number} options.colspan - how many columns the empty-state cell should span
   */
  function renderRows(tbody, items, options) {
    if (!tbody) return;
    const { toRow, emptyMessage, colspan } = options || {};

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colspan || 1}" style="padding: 24px; text-align: center; color: var(--text-secondary);">${emptyMessage || 'No records found.'}</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(toRow).join('');
  }

  window.DomTable = { renderRows };
})();
