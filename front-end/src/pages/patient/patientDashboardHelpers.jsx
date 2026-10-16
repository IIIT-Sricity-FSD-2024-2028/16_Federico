'use strict';

/**
 * The small badge components patient-dashboard.js rendered inline. The pure
 * helpers that sat beside them live in patientDashboardUtils.js.
 */

const STATUS_MAP = {
  confirmed: 'confirmed',
  scheduled: 'scheduled',
  pending: 'pending',
  cancelled: 'pending',
  completed: 'confirmed',
};

export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  if (s === 'critical') {
    return (
      <span className="status overdue" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
        Critical
      </span>
    );
  }
  return <span className={'status ' + (STATUS_MAP[s] || 'pending')}>{status}</span>;
}

export function BillStatusBadge({ status }) {
  if (status === 'paid') return <span className="status confirmed">Paid</span>;
  if (status === 'overdue') {
    return (
      <span className="status pending" style={{ background: '#fde8e8', color: '#c0392b' }}>
        Overdue
      </span>
    );
  }
  return <span className="status pending">Pending</span>;
}

/** The one place the dashboard renders a doctor's name under a department. */
export function DoctorLine({ doctorName }) {
  if (!doctorName) return null;
  return (
    <div style={{ color: 'var(--muted)', fontSize: '11px' }}>
      Dr. {doctorName.replace(/^Dr\.\s*/i, '')}
    </div>
  );
}
