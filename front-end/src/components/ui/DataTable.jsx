'use strict';

/**
 * Ported from shared/dom-table.js#renderRows. `toRow` returned an HTML string
 * there and returns JSX here; the empty-state cell keeps its exact inline
 * style so tables that use it look identical.
 */
export default function DataTable({ items, renderRow, emptyMessage, colspan }) {
  if (!items || items.length === 0) {
    return (
      <tr>
        <td
          colSpan={Number(colspan) || 1}
          style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary, #6b7280)' }}
        >
          {emptyMessage || 'No records found.'}
        </td>
      </tr>
    );
  }
  return <>{items.map(renderRow)}</>;
}

