'use strict';

import '../css/page-header.css';

/**
 * Standard page title header banner across all views.
 */
export default function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className = '',
}) {
  return (
    <header className={['page-header-component', className].filter(Boolean).join(' ')}>
      <div className="page-header-text">
        <div className="page-header-title-row">
          <h1 className="page-header-title">{title}</h1>
          {badge ? <div className="page-header-badge">{badge}</div> : null}
        </div>
        {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
