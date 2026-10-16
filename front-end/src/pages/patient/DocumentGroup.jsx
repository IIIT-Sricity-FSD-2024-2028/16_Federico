'use strict';

/**
 * One of the three "Documents From HOM" groups on the dashboard sidebar. Only
 * the first three rows of each group are shown, as before.
 */
export default function DocumentGroup({ rows, emptyText, actionLabel, containerId, onView }) {
  return (
    <div id={containerId}>
      {rows.length === 0 ? (
        <div className="doc-empty-hint">{emptyText}</div>
      ) : (
        rows.slice(0, 3).map((doc) => (
          <div className="doc-card" key={doc.id}>
            <div className="doc-info">
              <strong>{doc.title}</strong>
              <span>
                {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                • ₹{Number(doc.amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <button type="button" className="btn-doc-view" onClick={() => onView(doc)}>
              {actionLabel}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

