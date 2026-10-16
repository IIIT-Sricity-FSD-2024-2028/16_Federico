'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/layout/Modal.jsx';
import { toast } from '../../components/feedback/feedback.js';
import { formatDate, to12Hour } from './preHelpers.js';

function autoMatchWard(wards, department) {
  const deptLower = String(department || '').toLowerCase();
  const matched = (wards || []).find((w) => {
    const wName = String(w.ward_name).toLowerCase();
    if (deptLower.includes('pediatr') && wName.includes('pediatr')) return true;
    if ((deptLower.includes('cardio') || deptLower.includes('heart')) && wName.includes('cardiac')) return true;
    if ((deptLower.includes('matern') || deptLower.includes('gynec') || deptLower.includes('obstet')) && wName.includes('matern')) return true;
    if (deptLower.includes('icu') && wName.includes('icu')) return true;
    return false;
  });
  return matched ? String(matched.ward_id) : '';
}

export default function BedRequestModal({ request, wards, onClose, onSubmitted }) {
  if (!request) return null;
  return (
    <BedRequestForm
      key={request.pre_request_id}
      request={request}
      wards={wards}
      onClose={onClose}
      onSubmitted={onSubmitted}
    />
  );
}

function BedRequestForm({ request, wards, onClose, onSubmitted }) {
  const [wardId, setWardId] = useState(() => autoMatchWard(wards, request.department));
  const [priority, setPriority] = useState('NORMAL');
  const [submitting, setSubmitting] = useState(false);

  const selectedWard = wardId ? wards.find((w) => w.ward_id === Number(wardId)) : null;

  async function dispatchBedRequest() {
    setSubmitting(true);
    try {
      await api.preRequests.update(request.pre_request_id, {
        visit_type: 'Admit',
        ward_type: selectedWard ? selectedWard.ward_name : undefined,
      });
      await api.wards.bedRequests.create({
        patient_id: request.patient_id,
        pre_request_id: request.pre_request_id,
        ward_id: wardId ? Number(wardId) : undefined,
        priority,
      });
      toast('Bed request dispatched to HOM. Status: Pending.', 'success');
      onClose();
      await onSubmitted();
    } catch (err) {
      toast(err.message || 'Could not dispatch bed request', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} className="popup" labelledBy="pre-bed-request-title">
      <div id="preBedRequestModal" style={{ display: 'contents' }}>
        <div className="emergency-modal-content" style={{ maxWidth: 860 }}>
          <div className="emergency-modal-head">
            <div>
              <h2 id="pre-bed-request-title" style={{ color: 'var(--md-primary, #0f766e)' }}>Bed Request</h2>
            </div>
            <button className="emergency-modal-close" type="button" onClick={onClose} aria-label="Close modal">{'x'}</button>
          </div>

        <div className="appointment-grid">
          <div>
            <div id="homSelectedPatientBox" className="quick-patient-box" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong id="homCardPatientName" style={{ fontSize: 14 }}>{request.patientName}</strong>
                <Badge variant="neutral" id="homCardPatientUhid">
                  {request.patientUhid}
                </Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted-fg)' }}>
                Department: <strong id="homCardDept" style={{ color: 'var(--color-fg)' }}>{request.department || '-'}</strong> {' '}
                Doctor: <strong style={{ color: 'var(--color-fg)' }}>{request.doctorName || '-'}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted-fg)', marginTop: 6 }}>
                Appointment: <strong style={{ color: 'var(--color-fg)' }}>{formatDate(request.requested_date)}</strong> {' '}
                <strong style={{ color: 'var(--color-fg)' }}>{to12Hour(request.requested_time) || '-'}</strong>
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="appointment-form-group">
                <label className="emergency-form-label" htmlFor="wardType">Preferred Ward Category</label>
                <select id="wardType" className="emergency-form-control" value={wardId} onChange={(e) => setWardId(e.target.value)}>
                  <option value="">HOM Decides Best Ward</option>
                  {(wards || []).map((w) => (
                    <option key={w.ward_id} value={w.ward_id}>{w.ward_name} ({w.total_beds || 0} Beds)</option>
                  ))}
                </select>
              </div>

              <div className="appointment-form-group">
                <label className="emergency-form-label" htmlFor="priority">Triage Priority *</label>
                <select id="priority" className="emergency-form-control" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="NORMAL">Normal Priority</option>
                  <option value="URGENT">Urgent Priority</option>
                  <option value="CRITICAL">Critical Priority</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button variant="secondary" className="suggest" type="button" onClick={onClose} style={{ height: 44, padding: '0 20px', fontSize: 12, fontWeight: 600 }}>
                Cancel
              </Button>
              <Button variant="primary" className="green" type="button" onClick={dispatchBedRequest} disabled={submitting} style={{ height: 44, padding: '0 24px', fontSize: 12, fontWeight: 600 }}>
                Dispatch Bed Request
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
);
}
