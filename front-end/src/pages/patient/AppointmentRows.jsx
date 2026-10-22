'use strict';

import EmptyState from '../../components/ui/EmptyState.jsx';

const STATUS_MAP = {
  confirmed: 'confirmed',
  scheduled: 'scheduled',
  pending: 'pending',
  cancelled: 'pending',
  completed: 'confirmed',
};

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  if (s === 'critical') {
    return (
      <span className="status overdue" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
        Critical
      </span>
    );
  }
  return <span className={'status ' + (STATUS_MAP[s] || 'pending')}>{status || 'Pending'}</span>;
}

function DoctorLine({ doctorName }) {
  if (!doctorName) return null;
  return (
    <div style={{ color: 'var(--muted)', fontSize: '11px' }}>
      Dr. {String(doctorName).replace(/^Dr\.\s*/i, '')}
    </div>
  );
}

/**
 * Enhanced appointments <tbody> row renderer for the dashboard's Appointments Hub.
 */
export default function AppointmentRows({
  appointments = [],
  emptyMessage = 'No appointments found.',
  onViewSlip,
}) {
  if (!appointments || appointments.length === 0) {
    return <EmptyState asTableRow colSpan={5} title={emptyMessage} />;
  }

  return appointments.map((a) => {
    const isSlipAvailable = ['Confirmed', 'Completed'].includes(a.status);
    const isPending = ['Pending', 'Scheduled'].includes(a.status);

    return (
      <tr key={a.id}>
        <td>
          <strong style={{ display: 'block', fontSize: '13px' }}>{a.displayDate}</strong>
          <small style={{ color: 'var(--muted, #64748b)', fontSize: '11px' }}>{a.time}</small>
        </td>
        <td>
          <strong>{a.department}</strong>
          <DoctorLine doctorName={a.doctorName} />
        </td>
        <td>
          <span style={{ fontSize: '12.5px', color: 'var(--text-main, #0f172a)' }}>
            {a.type || 'Consultation'}
          </span>
        </td>
        <td>
          <StatusBadge status={a.status} />
        </td>
        <td style={{ textAlign: 'right' }}>
          {isSlipAvailable && onViewSlip ? (
            <button
              type="button"
              className="btn-view-slip"
              onClick={() => onViewSlip(a)}
            >
              View Slip →
            </button>
          ) : isPending ? (
            <span style={{ fontSize: '11.5px', color: '#b45309', fontWeight: 600 }}>
              Awaiting Review
            </span>
          ) : (
            <span style={{ color: '#94a3b8' }}>—</span>
          )}
        </td>
      </tr>
    );
  });
}
