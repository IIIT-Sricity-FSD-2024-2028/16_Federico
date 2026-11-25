'use strict';

import { useMemo } from 'react';
import { useAppSelector, useLoader } from '../../store/hooks.js';
import { loadFaCharges } from '../../store/pageLoaders.js';
import { selectLeaders } from '../../store/slices/billingSlice.js';
import { useFa } from './useFa.js';
import { buildCharges, selectBillingOverview, formatCurrency } from './faHelpers.js';
import * as actions from './faActions.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ViewFrame from './ViewFrame.jsx';
import * as S from './faStyles.js';

export default function ChargesView() {
  const ctx = useFa();

  const { loaded, error, loading } = useLoader(loadFaCharges, { deps: [ctx.version] });
  const overview = useAppSelector(selectBillingOverview);
  const leaders = useAppSelector(selectLeaders);
  const ledgerEntries = useAppSelector((state) => state.billing.ledgerEntries);

  // The charges table is derived from the slices (overview, leaders, entries).
  const data = useMemo(
    () => (loaded ? buildCharges(overview, leaders, ledgerEntries) : null),
    [loaded, overview, leaders, ledgerEntries],
  );

  return (
    <ViewFrame loading={loading} error={error}>
      {data ? (
        <>
          <PageHeader
            title="Charges"
            subtitle="Review and approve departmental billing items before posting to active patient ledgers."
          />

          <div className="card" style={S.cardFlush}>
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={S.panelTitle}>Recent Charges</h3>
              {data.pendingItems.length ? (
                <span className="badge badge-warning">{data.pendingItems.length} Pending Approval</span>
              ) : null}
            </div>
            <table className="data-table" style={S.tableStyle}>
              <thead style={S.theadStyle}>
                <tr>
                  <th style={S.th}>User / Patient</th>
                  <th style={S.th}>UHID</th>
                  <th style={S.th}>Service</th>
                  <th style={S.thCenter}>Qty</th>
                  <th style={S.th}>Amount</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.allCharges.length === 0 ? (
                  <EmptyState asTableRow colSpan={7} title="No charges posted yet." />
                ) : (
                  data.allCharges.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={S.td}>
                        <strong style={{ color: 'var(--color-fg)' }}>{c.patientName || '-'}</strong>
                        <span
                          style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}
                        >
                          User ID: #{String(c.patientId)}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span className="uhid-badge">{c.uhid || '-'}</span>
                      </td>
                      <td style={{ ...S.td, color: 'var(--color-fg)' }}>{c.serviceName}</td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <strong>{c.quantity}</strong>
                      </td>
                      <td style={{ ...S.td, fontWeight: 600, color: 'var(--color-fg)' }}>
                        {formatCurrency(c.amount)}
                      </td>
                      <td style={S.td}>
                        {c.isPending ? (
                          <span className="badge badge-warning">Pending</span>
                        ) : (
                          <span className="badge badge-success">Approved</span>
                        )}
                      </td>
                      <td style={S.td}>
                        {c.isPending ? (
                          <button
                            className="btn-primary"
                            style={S.tinyBtn}
                            onClick={() => actions.approveLeader(ctx, c.leaderId)}
                          >
                            Approve
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>In Ledger</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </ViewFrame>
  );
}
