'use strict';

import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useFa } from './FaContext.jsx';
import { loadBillingOverview, loadLedgerEntries, ledgerTotal, formatCurrency } from './faHelpers.js';
import { useSelectedRow } from './useSelectedRow.js';
import * as actions from './faActions.js';
import { toast } from '../../components/feedback/feedback.js';
import PatientPicker from './PatientPicker.jsx';
import StatusBadge from './StatusBadge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ViewFrame from './ViewFrame.jsx';
import { LedgerQueues } from './FaQueues.jsx';
import * as S from './faStyles.js';

const DETAIL_ID = 'fa-ledger-detail';

/**
 * Running Ledgers: the FA landing view. The billing work queues (formerly the
 * Dashboard view; #/dashboard still routes here), then the selected patient's
 * running ledger with manual charge posting.
 */
export default function LedgerView() {
  const ctx = useFa();
  const [addService, setAddService] = useState('');
  const [addQty, setAddQty] = useState('1');

  const { data, error, loading } = useApi(() => loadBillingOverview(), [ctx.version]);

  const rows = data?.rows;
  const { selectedId, row } = useSelectedRow(ctx, rows);

  return (
    <ViewFrame loading={loading} error={error}>
      {data ? <LedgerQueues rows={rows} ctx={ctx} detailId={DETAIL_ID} /> : null}
      {data ? (
        !row ? (
          <div id={DETAIL_ID}>
            <EmptyState
              title="No patient selected"
              description="Select an active patient admission to view or update their financial ledger."
            />
          </div>
        ) : (
          <div id={DETAIL_ID}>
            <PatientPicker rows={rows} currentAdmissionId={selectedId} />
            {row.ledger ? (
              <LoadedLedger
                ctx={ctx}
                row={row}
                servicesById={data.servicesById}
                addService={addService}
                setAddService={setAddService}
                addQty={addQty}
                setAddQty={setAddQty}
              />
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                  }}
                >
                  <h2 style={{ margin: 0, color: 'var(--color-fg)', fontWeight: 700 }}>
                    Ledger: {row.patient.name || '-'}
                  </h2>
                </div>
                <EmptyState
                  title="Ledger not created yet"
                  description="This patient has been admitted, but finance has not initialized the ledger yet."
                  action={
                    <button
                      className="btn-primary"
                      style={{ padding: '10px 18px' }}
                      onClick={() => actions.createLedgerAndOpen(ctx, row.admission.admission_id)}
                    >
                      Create Ledger Now
                    </button>
                  }
                />
              </>
            )}
          </div>
        )
      ) : null}
    </ViewFrame>
  );
}

function LoadedLedger({ ctx, row, servicesById, addService, setAddService, addQty, setAddQty }) {
  const { data: entries } = useApi(
    () => loadLedgerEntries(row.ledger.ledger_id),
    [ctx.version, row.ledger.ledger_id],
  );

  const list = entries || [];
  const total = ledgerTotal(list);
  const isOpd = row.admission.visit_type === 'OPD';
  const visitTag = isOpd
    ? 'OPD Consultation'
    : row.bed && row.bed.bed_number
      ? 'Inpatient · Bed ' + row.bed.bed_number
      : 'Inpatient';

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: 'var(--color-fg)', fontWeight: 700 }}>
            Ledger: {row.patient.name || '-'}{' '}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '12px',
                background: isOpd ? '#e0f2fe' : '#ede9fe',
                color: isOpd ? '#0369a1' : '#6d28d9',
                marginLeft: '6px',
              }}
            >
              {visitTag}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-muted-fg)' }}>
              <StatusBadge row={row} />
            </span>
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-muted-fg)' }}>
            User ID: #{String(row.patient.patient_id || '-')} &bull; UHID:{' '}
            <span className="uhid-badge">{row.patient.uhid || '-'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="md-btn md-btn-tonal"
            style={{ padding: '0 20px' }}
            onClick={() => actions.dispatchCurrent(ctx, row.ledger.ledger_id)}
          >
            Send EOD Bill to Patient
          </button>
          <button
            className="btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              background: row.dischargeApproved
                ? 'var(--md-primary)'
                : 'var(--md-surface-container-high)',
              color: row.dischargeApproved
                ? 'var(--md-on-primary)'
                : 'var(--md-on-surface-variant)',
            }}
            onClick={() => {
              if (row.dischargeApproved) {
                ctx.setCurrentAdmissionId(row.admission.admission_id);
                ctx.navigate('#/eod', row.admission.admission_id);
              } else {
                toast('Waiting for HOM discharge approval for this patient.', 'warning');
              }
            }}
          >
            {isOpd ? 'Finalize OPD Bill' : row.dischargeApproved ? 'Discharge Patient' : 'Await HOM Approval'}
          </button>
        </div>
      </div>

      <div className="card" style={{ ...S.cardFlush, marginBottom: '24px' }}>
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--color-muted-bg)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-fg)' }}>
            Add Manual Charge:
          </span>
          <select
            id="ledger-add-service"
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: '#fff',
              color: 'var(--color-fg)',
              minWidth: '220px',
            }}
            value={addService}
            onChange={(e) => setAddService(e.target.value)}
          >
            <option value="" disabled>
              Select service / item...
            </option>
            {Object.values(servicesById || {}).map((s) => (
              <option key={s.service_id} value={s.service_id}>
                {s.service_name} ({formatCurrency(s.base_cost)})
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-muted-fg)', fontWeight: 600 }}>
              Qty:
            </label>
            <input
              id="ledger-add-qty"
              type="number"
              min="1"
              style={{
                width: '60px',
                padding: '8px 10px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: '#fff',
                color: 'var(--color-fg)',
              }}
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={() =>
              actions.addChargeToCurrentLedger(
                ctx,
                row.admission.admission_id,
                row.ledger.ledger_id,
                addService ? Number(addService) : 0,
                Number(addQty),
              )
            }
          >
            + Post to Ledger
          </button>
        </div>
        <table className="data-table" style={S.tableStyle}>
          <thead style={S.theadStyle}>
            <tr>
              <th style={S.thWide}>Service</th>
              <th style={S.thWide}>Qty</th>
              <th style={S.thWide}>Unit Price</th>
              <th style={S.thWide}>Total</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <EmptyState asTableRow colSpan={4} title="No ledger entries found." />
            ) : (
              list.map((e) => (
                <tr key={e.entry_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ ...S.tdWide, color: 'var(--color-muted-fg)' }}>
                    {servicesById[e.service_id]?.service_name || 'Service #' + e.service_id}
                  </td>
                  <td style={{ ...S.tdWide, color: 'var(--color-fg)' }}>{e.quantity}</td>
                  <td style={{ ...S.tdWide, color: 'var(--color-fg)' }}>{formatCurrency(e.unit_price)}</td>
                  <td style={{ ...S.tdWide, fontWeight: 600, color: 'var(--color-fg)' }}>
                    {formatCurrency(e.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div
          style={{
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
          }}
        >
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg)' }}>
              FA Approved Charges:{' '}
              <strong style={{ color: 'var(--md-primary, #6750A4)' }}>{formatCurrency(total)}</strong>
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>
              ({list.length} approved line {list.length === 1 ? 'item' : 'items'})
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--color-fg)', fontWeight: 700 }}>
            Total Due: <span style={{ color: 'var(--color-fg)' }}>{formatCurrency(total)}</span>
          </h3>
        </div>
      </div>
    </>
  );
}

