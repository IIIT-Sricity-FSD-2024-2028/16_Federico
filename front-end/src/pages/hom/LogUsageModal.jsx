'use strict';

import { useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { formatCurrency } from './homHelpers.js';
import { itemCost, findPatientByUhid, validateUsageDetails } from './inventoryHelpers.js';
import AdmittedPatientPicker from './AdmittedPatientPicker.jsx';

/** Ported from #modal-log-usage plus openLogUsageModal / submitModalUsage in HOM/inventory.js. */
export default function LogUsageModal({ open, initialItemId, data, admittedPatients = [], onClose, onSubmit }) {
  // Mounted only while open (re-keyed per item), so each opening starts fresh.
  if (!open) return null;
  return (
    <LogUsageForm
      key={initialItemId ?? 'none'}
      initialItemId={initialItemId}
      data={data}
      admittedPatients={admittedPatients}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function LogUsageForm({ initialItemId, data, admittedPatients = [], onClose, onSubmit }) {
  const [itemId, setItemId] = useState(initialItemId ? String(initialItemId) : '');
  const [uhid, setUhid] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  const item = data.items.find((i) => i.item_id === Number(itemId));
  const cost = itemCost(item, data.services);
  const patient = findPatientByUhid(uhid, data.patients);

  async function submit() {
    const err = validateUsageDetails({ uhid: uhid.trim(), itemId: Number(itemId), qty: Number(qty) }, data);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    try {
      await onSubmit(uhid.trim(), Number(itemId), Number(qty));
    } catch (e) {
      setError(e.message || 'Unable to record supply usage.');
      return;
    }
    onClose();
  }

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Log Inventory Usage"
      subtitle="Post supply usage to the patient's administrative billing ledger"
      size="md"
      footer={
        <div className="restock-footer">
          <button type="button" className="restock-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="restock-btn-submit" onClick={submit}>
            Post to Ledger
          </button>
        </div>
      }
    >
      <div className="restock-form-container">
        <div className="restock-form-field">
          <label htmlFor="modal-item-select" className="restock-label">
            Supply Item <span className="restock-req">*</span>
          </label>
          <div className="restock-select-wrapper">
            <select
              className="restock-select"
              id="modal-item-select"
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setError('');
              }}
            >
              <option value="">Select supply item...</option>
              {data.items.map((i) => (
                <option key={i.item_id} value={i.item_id}>
                  {i.item_name} ({i.stock_quantity} available)
                </option>
              ))}
            </select>
            <svg
              className="restock-select-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="restock-form-field">
          <label htmlFor="modal-uhid" className="restock-label">
            Patient (Admitted) <span className="restock-req">*</span>
          </label>
          <AdmittedPatientPicker
            id="modal-uhid"
            admittedPatients={admittedPatients}
            selectedUhid={uhid}
            onSelect={(p) => {
              setUhid(p ? p.uhid : '');
              setError('');
            }}
            error={Boolean(error && !uhid)}
          />
        </div>

        <div
          id="modal-patient-box"
          style={{
            display: patient ? 'flex' : 'none',
            alignItems: 'center',
            gap: 8,
            background: 'var(--primary-light, #f3edf7)',
            border: '1px solid var(--primary, #6750a4)',
            borderRadius: '8px',
            padding: '10px 14px',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary, #6750a4)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }} id="modal-patient-name">
            {patient ? 'Patient: ' + patient.name : 'Patient: '}
          </p>
        </div>

        <div className="restock-form-field">
          <label className="restock-label">
            Quantity <span className="restock-req">*</span>
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="stepper-btn" onClick={() => setQty((v) => Math.max(1, v - 1))}>
              {'−'}
            </button>
            <input type="number" className="stepper-input" id="modal-qty" value={qty} readOnly />
            <button type="button" className="stepper-btn" onClick={() => setQty((v) => Math.max(1, v + 1))}>
              +
            </button>
          </div>
        </div>

        <div className="restock-cost-card">
          <div className="restock-cost-breakdown">
            <span className="restock-cost-title">Cost Preview</span>
            <span className="restock-cost-formula" id="modal-calc-text">
              {!item ? '₹0 × 1' : cost === null ? 'Non-billable supply' : `${formatCurrency(cost)} × ${qty} units`}
            </span>
          </div>
          <div className="restock-cost-total" id="modal-total-cost">
            {!item ? '₹0' : cost === null ? 'Stock Only' : formatCurrency(cost * qty)}
          </div>
        </div>

        <div
          style={{
            background: 'var(--info-bg, #e0f2fe)',
            borderRadius: '8px',
            padding: '10px 14px',
            border: '1px solid #bae6fd',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--info-text, #075985)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p style={{ fontSize: 12.5, color: 'var(--info-text, #075985)', margin: 0 }}>
            This charge will be posted to the patient&apos;s administrative billing ledger.
          </p>
        </div>

        {error ? (
          <div id="modal-usage-error" className="restock-error-banner">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}

