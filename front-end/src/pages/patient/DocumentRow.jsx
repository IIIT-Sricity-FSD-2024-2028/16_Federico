'use strict';

import { forRole } from '../../lib/sanitizer.js';

/**
 * The receipts / discharge / EOD row. All three render identical markup and
 * differ only in their status chip, so they share one component. The row text
 * comes from the sanitised copy, matching the legacy code exactly.
 */
export default function DocumentRow({ row, statusChip, onView }) {
  const safeRow = forRole(row, 'PATIENT');

  return (
    <div className="billing-row">
      <div className="billing-row-main">
        <div className="billing-row-title">
          <strong>{safeRow.title || 'Receipt'}</strong>
          {statusChip}
        </div>
        <span className="billing-row-date">
          {safeRow.createdAt ? new Date(safeRow.createdAt).toLocaleString('en-IN') : '—'}
        </span>
      </div>
      <div className="billing-row-meta">
        <strong className="billing-row-amount">
          ₹{Number(safeRow.amount || 0).toLocaleString('en-IN')}
        </strong>
        <div className="billing-row-actions">
          <button className="btn-download" type="button" onClick={() => onView(row)}>
            View Digital Copy
          </button>
        </div>
      </div>
    </div>
  );
}

