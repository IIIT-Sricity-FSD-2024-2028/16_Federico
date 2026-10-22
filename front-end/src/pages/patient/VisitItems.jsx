'use strict';

/**
 * Renders the visit history list item markup for the dashboard's "Recent Visits" panel
 * and the full-history modal.
 */
export default function VisitItems({ visits = [], emptyMessage = 'No visits recorded yet.', departmentFontSize = '11px' }) {
  if (!visits || visits.length === 0) {
    return (
      <div className="visit-item">
        <span style={{ color: 'var(--muted)' }}>{emptyMessage}</span>
      </div>
    );
  }

  return visits.map((v) => (
    <div className="visit-item" key={v.id}>
      <div className="visit-title">
        <span className="visit-dot" />
        <div>
          <strong>{v.description}</strong>
          <div style={{ fontSize: departmentFontSize, color: 'var(--muted)' }}>
            {v.department || 'General'}
          </div>
        </div>
      </div>
      <span className="visit-date">{v.date}</span>
    </div>
  ));
}
