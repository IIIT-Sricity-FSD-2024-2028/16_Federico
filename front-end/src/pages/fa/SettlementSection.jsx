'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { loadLedgerEntries, ledgerTotal, formatCurrency } from './faHelpers.js';
import * as actions from './faActions.js';

/**
 * Cashier & discharge settlement for the selected admission (formerly the
 * Discharge view): waits for HOM's discharge approval, then shows the bill
 * summary with the insurance deduction and the payment actions; once the
 * ledger is PAID it offers the printed discharge summary. The discharge
 * summary's final amount is derived server-side from the ledger entries.
 */
export default function SettlementSection({ ctx, row }) {
  const { data: extra } = useApi(async () => {
    const entries = row.ledger ? await loadLedgerEntries(row.ledger.ledger_id) : [];
    let insurance = null;
    try {
      const list = await api.patients.insuranceForPatient(row.patient.patient_id);
      insurance = list && list[0] ? list[0] : null;
    } catch {
      insurance = null;
    }
    return { entries, insurance };
  }, [ctx.version, row.admission.admission_id, row.ledger?.ledger_id]);

  if (!row.dischargeApproved) {
    return (
      <>
        <PageHeader
          title="Final Discharge Summary"
          subtitle={row.patient.name || '-'}
        />
        <EmptyState
          title="Awaiting HOM discharge approval"
          message="FA can finalize billing only after HOM approves this patient's discharge request."
        />
      </>
    );
  }

  if (row.ledger && row.ledger.status === 'PAID') {
    return (
      <>
        <PageHeader
          title="Final Discharge Summary"
          subtitle={row.patient.name || '-'}
        />
        <EmptyState
          title="Payment Received"
          message={
            <span>
              Billing is finalized.{' '}
              <a
                href="#fa-receipts"
                style={{ color: 'var(--color-accent)' }}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('fa-receipts')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Receipt
              </a>
            </span>
          }
          action={
            <button
              className="btn-primary"
              style={{ padding: '12px 20px' }}
              onClick={() => actions.printDischargeSummary(ctx, row.admission.admission_id, ctx.hospitalName)}
            >
              Print Discharge Summary
            </button>
          }
        />
      </>
    );
  }

  return extra ? <Settlement ctx={ctx} row={row} entries={extra.entries} insurance={extra.insurance} /> : null;
}

function Settlement({ ctx, row, entries, insurance }) {
  // Read live at click time by the payment / summary actions.
  const { coverageOverrideRef } = ctx;
  const grossTotal = ledgerTotal(entries);
  const coverageLimit = insurance ? Math.min(Number(insurance.coverage_limit || 0), grossTotal) : 0;
  const [userOverride, setUserOverride] = useState(null);
  const overrideDeduction = userOverride !== null ? userOverride : coverageLimit;

  const effectiveDeduction = Math.min(Math.max(0, overrideDeduction), grossTotal);
  const netPayable = Math.max(0, grossTotal - effectiveDeduction);
  const dispatched = Boolean(row.ledger) && row.ledger.status === 'DISPATCHED';

  const isOpdDischarge = row.admission.visit_type === 'OPD';
  const pageTitleText = isOpdDischarge ? 'OPD Bill Summary & Settlement' : 'Final Discharge Summary';
  const actionButtonLabel = isOpdDischarge ? 'Finalize & Settle Bill' : 'Discharge Patient';

  const paymentError = ctx.formErrors['discharge-payment-error'];

  return (
    <>
      <PageHeader
        title={pageTitleText}
        subtitle={row.patient.name || '-'}
      />

      <div
        className="card"
        style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px' }}
      >
        <div>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: 'var(--color-fg)' }}>
            Bill Summary
          </h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-muted-fg)',
              fontSize: '15px',
            }}
          >
            <span>Gross Total</span>
            <span>{formatCurrency(grossTotal)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--status-error)',
              fontSize: '15px',
            }}
          >
            <span>Insurance Deduction ({insurance?.provider_name || 'None'})</span>
            <span>- {formatCurrency(coverageLimit)}</span>
          </div>
          <div className="md-field" style={{ margin: '12px 0 0' }}>
            <label>Override Deduction (Rs)</label>
            <input
              type="number"
              id="coverage-override"
              ref={coverageOverrideRef}
              value={overrideDeduction}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Number(e.target.value);
                setUserOverride(val);
              }}
              min="0"
              max={grossTotal}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '16px 0',
              color: 'var(--color-accent)',
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            <span>Net Payable</span>
            <span id="net-payable-preview">{formatCurrency(netPayable)}</span>
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontWeight: 700, fontSize: '13px' }}
            onClick={() => actions.generateDischargeSummary(ctx, row.admission.admission_id)}
          >
            {actionButtonLabel}
          </button>
        </div>

        <div>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: 'var(--color-fg)' }}>Payment</h3>
          {!row.ledger ? (
            <>
              <p style={{ color: 'var(--color-muted-fg)', fontSize: '14px' }}>
                No ledger exists for this admission yet.
              </p>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontWeight: 700 }}
                onClick={() => actions.createLedgerAndOpen(ctx, row.admission.admission_id)}
              >
                Create Ledger
              </button>
            </>
          ) : !dispatched ? (
            <>
              <p style={{ color: 'var(--color-muted-fg)', fontSize: '14px', marginBottom: '16px' }}>
                Send the bill so the patient can pay online, or record a manual payment for a walk-in.
              </p>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontWeight: 700, marginBottom: '12px' }}
                onClick={() => actions.dispatchCurrent(ctx, row.ledger.ledger_id)}
              >
                Send Bill to Patient
              </button>
              <button
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontWeight: 700,
                  background: 'var(--md-secondary-container)',
                  color: 'var(--md-on-secondary-container)',
                }}
                onClick={() => actions.recordCashPayment(ctx, row.ledger.ledger_id)}
              >
                Record Cash Payment
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-muted-bg)',
                  color: 'var(--color-muted-fg)',
                  fontSize: '13px',
                }}
              >
                Bill sent — the patient can pay from their own billing page. You can also record cash
                collected in person below.
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontWeight: 700 }}
                onClick={() => actions.recordCashPayment(ctx, row.ledger.ledger_id)}
              >
                Record Cash Payment
              </button>
            </>
          )}
          <div
            id="discharge-payment-error"
            style={{
              display: paymentError ? 'block' : 'none',
              marginTop: '12px',
              fontSize: '12px',
              color: 'var(--status-error)',
              fontWeight: 600,
            }}
          >
            {paymentError}
          </div>
        </div>
      </div>
    </>
  );
}
