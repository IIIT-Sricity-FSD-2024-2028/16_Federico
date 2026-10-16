'use strict';

import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useFa } from './FaContext.jsx';
import { loadBillingOverview, loadLedgerEntries, formatCurrency } from './faHelpers.js';
import * as actions from './faActions.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ViewFrame from './ViewFrame.jsx';
import * as S from './faStyles.js';

export default function ChargesView() {
  const ctx = useFa();

  const { data, error, loading } = useApi(async () => {
    const [overview, leaders] = await Promise.all([
      loadBillingOverview(),
      api.billing.leaders.list().catch(() => []),
    ]);
    const { rows, servicesById, patientsById, admissionsById } = overview;

    // Pending items submitted by HOM (not yet approved into ledger)
    const pendingItems = (leaders || [])
      .filter((l) => l.status === 'PENDING')
      .map((l) => {
        const admission = admissionsById[l.admission_id];
        const patient = l.patient_id
          ? patientsById[l.patient_id]
          : admission
            ? patientsById[admission.patient_id]
            : null;
        const service = servicesById[l.service_id];
        return {
          id: 'pending-' + l.leader_id,
          leaderId: l.leader_id,
          isPending: true,
          patientId: patient?.patient_id || l.patient_id || '-',
          patientName: patient?.name || 'Patient',
          uhid: patient?.uhid || '-',
          serviceName: service?.service_name || 'Service #' + l.service_id,
          quantity: l.quantity,
          amount: l.amount,
          status: 'Pending',
          time: new Date(l.created_at || Date.now()),
        };
      });

    // Recent ledger entries approved in FA ledger
    const withLedgers = rows.filter((r) => r.ledger);
    const entryLists = await Promise.all(
      withLedgers.map((r) => loadLedgerEntries(r.ledger.ledger_id).then((entries) => ({ r, entries }))),
    );
    const recentLedgerItems = entryLists.flatMap(({ r, entries }) =>
      entries.map((e) => ({
        id: 'entry-' + r.ledger.ledger_id + '-' + e.entry_id,
        isPending: false,
        patientId: r.patient.patient_id || '-',
        patientName: r.patient.name,
        uhid: r.patient.uhid,
        serviceName: servicesById[e.service_id]?.service_name || 'Service #' + e.service_id,
        quantity: e.quantity,
        amount: e.amount,
        status: 'Approved',
        time: new Date(e.entry_time || Date.now()),
      })),
    );

    // Pending items at the top, then recent approved ledger items by time desc
    const allCharges = [...pendingItems, ...recentLedgerItems].sort(
      (a, b) => (b.isPending ? 1 : 0) - (a.isPending ? 1 : 0) || b.time - a.time,
    );

    return { pendingItems, allCharges };
  }, [ctx.version]);

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
