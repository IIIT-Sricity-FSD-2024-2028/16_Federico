'use strict';

import { useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import { formatCurrency } from './homHelpers.js';

/**
 * Ported from #modal-post-service plus openPostServiceModal / submitPostService
 * in HOM/billing.js.
 *
 * HOM stages the charge as a "leader"; FA approves it into the patient ledger.
 * Opened from Patient Flow's "+ Post Service" button.
 */
export default function PostServiceModal({ open, admissions, services, onClose, onChanged }) {
  // Mounted only while open, so every opening starts from a blank form.
  if (!open) return null;
  return <PostServiceForm admissions={admissions} services={services} onClose={onClose} onChanged={onChanged} />;
}

function PostServiceForm({ admissions, services, onClose, onChanged }) {
  const [admissionId, setAdmissionId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const service = services.find((s) => String(s.service_id) === String(serviceId));
  const unitPrice = service ? Number(service.base_cost || 0) : 0;
  const quantity = Math.max(1, Number(qty) || 1);

  async function submit() {
    setError('');
    if (!admissionId) return setError('Please select a patient.');
    if (!serviceId) return setError('Please select a service.');
    if (quantity < 1) return setError('Quantity must be at least 1.');

    const selectedAdm = admissions.find((a) => a.admission_id === Number(admissionId));
    setSubmitting(true);
    try {
      await api.billing.leaders.create({
        admission_id: Number(admissionId),
        patient_id: selectedAdm ? selectedAdm.patient_id : undefined,
        service_id: Number(serviceId),
        quantity,
      });
      toast('Service posted — forwarded to FA for approval.', 'success');
      onClose();
      await onChanged();
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Post Service Used"
      subtitle="Select a patient and the service they used. Forwarded to Finance Associate for approval."
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
          <button className="btn btn-secondary btn-default" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-default" id="btn-submit-service" onClick={submit} disabled={submitting}>
            Submit to FA
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>
              Patient / User ID <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select className="input" id="post-admission-select" style={{ width: '100%', height: 44, borderRadius: 'var(--radius-base)', appearance: 'auto' }}
              value={admissionId} onChange={(e) => setAdmissionId(e.target.value)}>
              <option value="">Select patient...</option>
              {admissions.map((a) => (
                <option key={a.admission_id} value={a.admission_id}>
                  {a.patientName} {'—'} {a.uhid || 'No UHID'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>
              Service Used <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select className="input" id="post-service-select" style={{ width: '100%', height: 44, borderRadius: 'var(--radius-base)', appearance: 'auto' }}
              value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Select service...</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id} data-cost={s.base_cost}>
                  {s.service_name} ({formatCurrency(s.base_cost)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>
                Quantity <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input type="number" className="input" id="post-quantity" min="1" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: '100%', borderRadius: 'var(--radius-base)' }} />
            </div>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Charge Amount</label>
              <input type="text" className="input" id="post-total-preview" readOnly value={formatCurrency(unitPrice * quantity)}
                style={{ width: '100%', borderRadius: 'var(--radius-base)', background: 'var(--neutral-bg)', fontWeight: 600, color: 'var(--text-primary)' }} />
            </div>
          </div>

          <div id="post-modal-error" style={{ display: error ? 'block' : 'none', fontSize: 13, color: 'var(--error)', fontWeight: 500, padding: '8px 12px', background: 'var(--error-bg)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        </div>
      </DialogShell>
    );
  }

