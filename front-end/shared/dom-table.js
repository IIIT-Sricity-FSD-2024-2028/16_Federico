'use strict';

/**
 * shared/dom-table.js
 *
 * Lightweight table rendering utility with standardized empty-state handling.
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
      const safeMessage = escape(emptyMessage || 'No records found.');
      const safeColspan = Number(colspan) || 1;
      tbody.innerHTML = `<tr><td colspan="${safeColspan}" style="padding: 24px; text-align: center; color: var(--text-secondary, #6b7280);">${safeMessage}</td></tr>`;
      return;
    }

    if (typeof toRow === 'function') {
      tbody.innerHTML = items.map(toRow).join('');
    }
  }

  window.DomTable = Object.freeze({ renderRows });
})();
