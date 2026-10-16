'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { formatCurrency, formatDateTime } from './faHelpers.js';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import * as actions from './faActions.js';
import * as S from './faStyles.js';

/**
 * Every issued tax receipt, newest first, with search and payment-mode filter
 * (formerly the Receipts view). `patientsById` comes from the parent view's
 * billing overview rather than a second load of it.
 */
export default function ReceiptsSection({ ctx, patientsById }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('ALL');

  const { data: receipts } = useApi(async () => {
    const list = await api.billing.receipts.list().catch(() => []);
    return [...list].sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
  }, [ctx.version]);

  return (
    <section id="fa-receipts" style={{ marginTop: '32px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--color-fg)', fontWeight: 700 }}>Payment Receipts</h2>
        <SearchToolbar
          searchQuery={query}
          onSearchChange={setQuery}
          placeholder="Search Patient or UHID..."
          filters={[
            {
              id: 'receipt-filter',
              value: mode,
              onChange: setMode,
              options: [
                { value: 'ALL', label: 'All Payment Methods' },
                { value: 'UPI', label: 'UPI' },
                { value: 'CARD', label: 'Card' },
                { value: 'CASH', label: 'Cash' },
                { value: 'NETBANKING', label: 'Netbanking' },
              ],
            },
          ]}
        />
      </div>

      <div className="card" style={S.cardFlush}>
        <table className="data-table" style={S.tableStyle}>
          <thead style={S.theadStyle}>
            <tr>
              <th style={S.th}>Receipt ID</th>
              <th style={S.th}>Date &amp; Time</th>
              <th style={S.th}>Patient Name</th>
              <th style={S.th}>Amount</th>
              <th style={S.th}>Mode</th>
              <th style={S.th}>Action</th>
            </tr>
          </thead>
          <tbody id="receipts-tbody">
            <Rows rows={receipts || []} patientsById={patientsById} query={query} mode={mode} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * filterReceipts() hid non-matching rows with `style.display = 'none'` rather
 * than removing them, and matched on the row's own data-patient / data-id /
 * data-mode attributes. Both are kept: same attributes, same display toggle.
 */
function Rows({ rows, patientsById, query, mode }) {
  if (!rows.length) {
    return <EmptyState asTableRow colSpan={6} title="No receipts found." />;
  }

  const q = query.toLowerCase();

  return rows.map((r) => {
    const patient = patientsById[r.patient_id] || {};
    const rowMode = (r.payment_mode || 'UNKNOWN').toUpperCase();
    const dataPatient = (patient.name || '').toLowerCase();
    const dataId = 'PAY' + r.receipt_id;
    const matches =
      (dataPatient.includes(q) || dataId.toLowerCase().includes(q)) &&
      (mode === 'ALL' || rowMode === mode);

    return (
      <tr
        key={r.receipt_id}
        className="receipt-row"
        style={{ borderBottom: '1px solid var(--color-border)', display: matches ? '' : 'none' }}
        data-patient={dataPatient}
        data-id={dataId}
        data-mode={rowMode}
      >
        <td style={{ ...S.td, color: 'var(--color-fg)', fontWeight: 600 }}>PAY{r.receipt_id}</td>
        <td style={{ ...S.td, color: 'var(--color-muted-fg)', fontSize: '13px' }}>
          {formatDateTime(r.generated_at)}
        </td>
        <td style={{ ...S.td, color: 'var(--color-fg)', fontWeight: 600 }}>{patient.name || '-'}</td>
        <td style={{ ...S.td, fontWeight: 800, color: 'var(--color-accent)' }}>
          {formatCurrency(r.amount)}
        </td>
        <td style={S.td}>
          <span className="badge">{rowMode}</span>
        </td>
        <td style={S.td}>
          <button className="btn-primary" style={S.tinyBtn} onClick={() => actions.printReceipt(r.receipt_id)}>
            🖨️ Print
          </button>
        </td>
      </tr>
    );
  });
}
