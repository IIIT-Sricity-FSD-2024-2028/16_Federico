'use strict';

/**
 * The visit list markup, shared by the dashboard's "Recent Visits" panel (first
 * three, 11px department line) and the full-history modal (all of them, 12px).
 */
export default function VisitItems({ visits, emptyMessage, departmentFontSize }) {
  if (visits.length === 0) {
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

