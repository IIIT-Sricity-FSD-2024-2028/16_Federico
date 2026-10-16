'use strict';

/**
 * One copy of the CSV helpers that HOM/patient-flow.js, HOM/billing.js and
 * HOM/inventory.js each declared separately. Behaviour is identical.
 */
export function csvEscape(value) {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

