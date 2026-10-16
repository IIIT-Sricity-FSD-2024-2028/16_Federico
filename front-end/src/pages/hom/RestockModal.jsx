'use strict';

import { useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import { formatCurrency } from './homHelpers.js';
import { itemCost, DEFAULT_RESTOCK_QUANTITY, MAX_NOTES_LENGTH } from './inventoryHelpers.js';

/**
 * Ported from #modal-request-restock plus openRestockModal / submitRestock in
 * HOM/inventory.js.
 *
 * Upload order is load-bearing: the supplier invoice is uploaded first so its
 * URL can be attached to the purchase request itself. A failed upload aborts
 * the whole submit, exactly as before.
 */
export default function RestockModal({ open, initialItemId, data, onClose, onChanged }) {
  // Mounted only while open (re-keyed per item), so each opening starts fresh.
  if (!open) return null;
  return (
    <RestockForm key={initialItemId ?? 'none'} initialItemId={initialItemId} data={data} onClose={onClose} onChanged={onChanged} />
  );
}

function RestockForm({ initialItemId, data, onClose, onChanged }) {
  const [itemId, setItemId] = useState(initialItemId ? String(initialItemId) : '');
  const [qty, setQty] = useState(String(DEFAULT_RESTOCK_QUANTITY));
  const [supplier, setSupplier] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [error, setError] = useState('');

  const item = data.items.find((i) => i.item_id === Number(itemId));
  const cost = itemCost(item, data.services);
  const quantityNum = Math.max(0, Number(qty) || 0);

  async function submit() {
    const item_id = Number(itemId);
    const quantity = Number(qty);
    const supplierName = supplier.trim();
    const noteText = notes.trim();
    const session = api.getSession();
    const selected = data.items.find((i) => i.item_id === item_id);

    if (!selected) {
      setError('Select an inventory supply item before submitting a purchase order.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Restock quantity must be a positive whole number greater than 0.');
      return;
    }
    if (!supplierName) {
      setError('Provide a supplier name for the purchase order.');
      return;
    }
    if (noteText.length > MAX_NOTES_LENGTH) {
      setError('Notes must be under ' + MAX_NOTES_LENGTH + ' characters.');
      return;
    }
    setError('');

    let invoiceUrl = null;
    if (invoiceFile) {
      setInvoiceStatus('Uploading invoice…');
      try {
        const uploaded = await api.uploads.inventory(invoiceFile);
        invoiceUrl = uploaded.url;
        setInvoiceStatus('Attached: ' + uploaded.originalName);
      } catch (err) {
        setError(err.message || 'Unable to upload the invoice file.');
        setInvoiceStatus('');
        return;
      }
    }

    try {
      await api.inventory.requests.create({
        item_id: selected.item_id,
        quantity_requested: quantity,
        status: 'PENDING',
        requested_by: session ? session.userId : null,
        supplier: supplierName,
        priority,
        notes: noteText,
        invoice_url: invoiceUrl,
      });
      toast('Purchase Order submitted for ' + quantity + 'x ' + selected.item_name + '.', 'success');
    } catch (err) {
      setError(err.message || 'Unable to submit purchase order.');
      return;
    }

    onClose();
    await onChanged();
  }

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Request Restock / Purchase Order"
      subtitle="Generate a non-clinical inventory supply purchase order for Finance approval"
      size="md"
      footer={
        <div className="restock-footer">
          <button type="button" className="restock-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="restock-btn-submit" onClick={submit}>
            Submit PO Request
          </button>
        </div>
      }
    >
      <div className="restock-form-container">
        {/* Row 1: Supply Item */}
        <div className="restock-form-field">
          <label htmlFor="restock-item-select" className="restock-label">
            Supply Item <span className="restock-req">*</span>
          </label>
          <div className="restock-select-wrapper">
            <select
              className="restock-select"
              id="restock-item-select"
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

        {/* Row 2: Quantity & Priority (2 columns) */}
        <div className="restock-form-grid">
          <div className="restock-form-field">
            <label htmlFor="restock-qty" className="restock-label">
              Quantity <span className="restock-req">*</span>
            </label>
            <input
              type="number"
              className="restock-input"
              id="restock-qty"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>

          <div className="restock-form-field">
            <span className="restock-label">Priority</span>
            <div className="restock-priority-group" role="radiogroup" aria-label="Priority">
              <button
                type="button"
                className={`restock-priority-btn ${priority === 'normal' ? 'is-active-normal' : ''}`}
                id="btn-priority-normal"
                onClick={() => setPriority('normal')}
              >
                Normal
              </button>
              <button
                type="button"
                className={`restock-priority-btn ${priority === 'urgent' ? 'is-active-urgent' : ''}`}
                id="btn-priority-urgent"
                onClick={() => setPriority('urgent')}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Urgent
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Supplier Name */}
        <div className="restock-form-field">
          <label htmlFor="restock-supplier" className="restock-label">
            Supplier Name <span className="restock-req">*</span>
          </label>
          <input
            type="text"
            className="restock-input"
            id="restock-supplier"
            placeholder="e.g. MediSupply Co., Global Health Logistics"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </div>

        {/* Row 4: Estimated Cost Card */}
        <div className="restock-cost-card">
          <div className="restock-cost-breakdown">
            <span className="restock-cost-title">Cost Estimation</span>
            <span className="restock-cost-formula" id="restock-calc-text">
              {!item ? '₹0 × 0' : cost === null ? 'No linked service rate' : `${formatCurrency(cost)} × ${quantityNum} units`}
            </span>
          </div>
          <div className="restock-cost-total" id="restock-total-cost">
            {!item ? '₹0' : cost === null ? 'Estimate unavailable' : formatCurrency(cost * quantityNum)}
          </div>
        </div>

        {/* Row 5: Notes & Supplier Invoice / Quote */}
        <div className="restock-form-grid">
          <div className="restock-form-field">
            <label htmlFor="restock-notes" className="restock-label">
              Notes (Optional)
            </label>
            <textarea
              className="restock-textarea"
              id="restock-notes"
              placeholder="Delivery instructions or batch details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="restock-form-field">
            <label className="restock-label">
              Supplier Invoice / Quote (Optional)
            </label>
            <label className="restock-file-zone" htmlFor="restock-invoice-input">
              <input
                type="file"
                id="restock-invoice-input"
                style={{ display: 'none' }}
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
              />
              <span className="restock-file-btn">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {invoiceFile ? 'Change' : 'Browse'}
              </span>
              <span className="restock-file-info" title={invoiceFile ? invoiceFile.name : 'PDF, PNG, JPG (max 10MB)'}>
                {invoiceFile ? invoiceFile.name : 'Attach file'}
              </span>
              {invoiceFile ? (
                <button
                  type="button"
                  className="restock-file-clear"
                  onClick={(e) => {
                    e.preventDefault();
                    setInvoiceFile(null);
                    setInvoiceStatus('');
                  }}
                  title="Remove file"
                  aria-label="Remove file"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : null}
            </label>
            <div id="restock-invoice-status" style={{ fontSize: 11.5, color: '#64748b', minHeight: 16 }}>
              {invoiceStatus}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error ? (
          <div id="restock-form-error" className="restock-error-banner">
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
