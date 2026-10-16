'use strict';

import '../css/empty-state.css';

/**
 * Universal zero-data placeholder for empty panels, lists, and tables.
 */
export default function EmptyState({
  icon = null,
  title = 'No records found',
  message,
  action,
  asTableRow = false,
  colSpan = 1,
  className = '',
}) {
  const content = (
    <div className={['empty-state-container', className].filter(Boolean).join(' ')}>
      {icon ? <div className="empty-state-icon">{icon}</div> : null}
      {title ? <h3 className="empty-state-title">{title}</h3> : null}
      {message ? <p className="empty-state-message">{message}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );

  if (asTableRow) {
    return (
      <tr>
        <td colSpan={colSpan} className="empty-state-table-cell">
          {content}
        </td>
      </tr>
    );
  }

  return content;
}
