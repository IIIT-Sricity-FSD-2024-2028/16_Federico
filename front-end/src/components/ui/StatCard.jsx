'use strict';

import { Link } from 'react-router-dom';
import '../css/stat-card.css';

/**
 * Universal KPI & Metric Card for dashboards across all portals.
 */
export default function StatCard({
  label,
  value,
  sub,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  icon,
  to,
  onClick,
  className = '',
  style,
}) {
  const content = (
    <>
      <div className="stat-card-header">
        <span className="stat-card-label" title={label}>
          {label}
        </span>
        {icon ? <span className="stat-card-icon">{icon}</span> : null}
      </div>

      <div className="stat-card-value">
        {value !== undefined && value !== null ? value : '--'}
      </div>

      {sub ? <div className="stat-card-sub">{sub}</div> : null}
    </>
  );

  const classes = [
    'stat-card-component',
    `variant-${variant}`,
    to ? 'is-link' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} style={style} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} style={style} onClick={onClick}>
      {content}
    </div>
  );
}
