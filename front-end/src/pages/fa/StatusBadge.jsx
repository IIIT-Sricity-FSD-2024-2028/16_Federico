'use strict';

/** FA/js/app.js#statusBadge, unchanged ladder. */
export default function StatusBadge({ row }) {
  if (!row.ledger) return <span className="badge badge-warning">Ledger Pending</span>;
  if (row.ledger.status === 'PAID') return <span className="badge badge-success">Paid</span>;
  if (row.ledger.status === 'DISPATCHED') return <span className="badge badge-info">EOD Sent</span>;
  if (row.ledger.status === 'PARTIALLY_PAID')
    return <span className="badge badge-info">Partially Paid</span>;
  return <span className="badge badge-warning">Active</span>;
}

