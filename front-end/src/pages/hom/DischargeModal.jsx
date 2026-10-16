'use strict';

import { useEffect, useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import { daysSince, formatCurrency } from './homHelpers.js';

/**
 * Ported from #modal-initiate-discharge plus openDischargeModal /
 * confirmDischarge in HOM/patient-flow.js.
 *
 * The total starts as "Calculating..." and is filled after the ledger fetch,
 * exactly as the original did - the modal opened first, then loaded. The
 * parent keys this modal by row, so each opening starts from that state.
 */
export default function DischargeModal({ row, onClose, onChanged }) {
  const [total, setTotal] = useState(null); // null = calculating
  const [error, setError] = useState('');

  useEffect(() => {
    if (!row) return;
    let cancelled = false;

    (async () => {
      let bundle = null;
      try {
        const bills = await api.billing.patient.bills(row.patient_id);
        bundle = bills.find((b) => b.ledger) || bills[0] || null;
      } catch {
        bundle = null;
      }
      if (cancelled) return;
      if (bundle && bundle.ledger) {
        const entries = await api.billing.ledger.entries(bundle.ledger.ledger_id).catch(() => []);
        if (cancelled) return;
        setTotal((Array.isArray(entries) ? entries : []).reduce((sum, e) => sum + Number(e.amount || 0), 0));
      } else {
        setTotal(0);
      }
    })();

    return () => { cancelled = true; };
  }, [row]);

  if (!row) return null;

  async function confirm() {
    if (row.status !== 'DISCHARGE_REQUESTED') {
      setError('This patient is not awaiting a HOM discharge clearance approval.');
      return;
    }
    setError('');
    try {
      await api.preRequests.update(row.pre_request_id, { status: 'DISCHARGE_APPROVED' });
      toast('Discharge clearance approved successfully. PRE notified to finalize release.', 'success');
    } catch (err) {
      setError(err.message || 'Unable to approve discharge clearance.');
      return;
    }
    onClose();
    await onChanged();
  }

  const field = (label, value) => (
    <div>
      <div className="label">{label}</div>
      <div style={{ fontWeight: 500, fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  );

  return (
    <DialogShell
      open
      onClose={onClose}
      title={'Approve Discharge — ' + row.patientName}
      subtitle="Confirm clearance to approve the patient release request and notify PRE to finalize discharge."
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary btn-default" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-default" onClick={confirm}>Confirm Clearance</button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: 'var(--status-warning-bg, #fbf2dc)', border: '1px solid rgba(165, 114, 10, 0.2)', borderRadius: 'var(--radius-base)', padding: 16 }}>
          <p style={{ color: 'var(--status-warning-fg, #7a5300)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            <strong>Discharge Clearance:</strong> Confirming clearance approves the patient&apos;s
            release request and notifies PRE to finalize discharge documentation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--neutral-bg)', padding: 16, borderRadius: 'var(--radius-base)' }}>
          {field('Patient', row.patientName)}
          {field('UHID', row.patientUhid)}
          {field('Department', row.department || 'General')}
          {field('Assigned Bed', row.bedNumber)}
          {field('Attending Physician', row.doctorName || 'Staff Physician')}
          {field('Length of Stay', daysSince(row.decided_at || row.created_at) + ' days')}
        </div>

        <div style={{ background: 'var(--md-surface-container, #ffffff)', border: '1px solid var(--border)', padding: 16, borderRadius: 'var(--radius-base)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Active Billing Balance</span>
            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--primary)' }} id="d-total-cost">
              {total === null ? 'Calculating...' : total === 0 ? '₹0' : formatCurrency(total)}
            </span>
          </div>
        </div>

        <div id="discharge-form-error" style={{ display: error ? 'block' : 'none', fontSize: 12, color: 'var(--error)', fontWeight: 500 }}>
          {error}
        </div>
      </div>
    </DialogShell>
  );
}
