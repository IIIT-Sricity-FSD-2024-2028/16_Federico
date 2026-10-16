'use strict';

import { useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import { formatDateTime } from './homHelpers.js';

/**
 * The one bed-allocation modal. Both of HOM's allocation entry points pick a
 * (pending bed request, available bed) pair, so they share this component:
 *
 *  - `bedId`        from Bed Management: the bed is fixed, choose which
 *                   pending request it goes to (#modal-assign-bed in beds.js).
 *  - `bedRequestId` from the Dashboard queue: the request is fixed, choose an
 *                   available bed, or deny it (#modal-admission-request in
 *                   dashboard.js - formerly AdmissionRequestModal.jsx).
 *
 * Allocation goes through PUT /ward/bed-requests/:id, which returns 409 if
 * the bed was taken in the meantime; that message is shown to the user.
 */
export default function AssignBedModal({ bedId = null, bedRequestId = null, data, onClose, onChanged }) {
  if (bedId !== null) {
    return <BedFirst key={'bed-' + bedId} bedId={bedId} data={data} onClose={onClose} onChanged={onChanged} />;
  }
  if (bedRequestId !== null) {
    return (
      <RequestFirst key={'req-' + bedRequestId} bedRequestId={bedRequestId} data={data} onClose={onClose} onChanged={onChanged} />
    );
  }
  return null;
}

function priorityVariant(priority) {
  if (priority === 'CRITICAL' || priority === 'URGENT') return 'error';
  if (priority === 'HIGH') return 'warning';
  return 'info';
}

async function allocate(bedRequestId, bedId) {
  await api.wards.bedRequests.allocate(bedRequestId, bedId);
  toast('Bed allocated and patient admitted successfully.', 'success');
}

// ------------------------------------------------- bed -> pick a request --

function BedFirst({ bedId, data, onClose, onChanged }) {
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [error, setError] = useState('');

  const bed = (data.beds || []).find((b) => b.bed_id === bedId);
  if (!bed) return null;

  const patientsById = {};
  (data.patients || []).forEach((p) => (patientsById[p.patient_id] = p));
  const preRequestsById = {};
  (data.preRequests || []).forEach((r) => (preRequestsById[r.pre_request_id] = r));

  const compatible = (data.bedRequests || []).filter(
    (r) => r.status === 'PENDING' && (!r.ward_id || r.ward_id === bed.ward_id),
  );

  async function confirm() {
    if (!selectedRequestId) {
      setError('Please select a pending patient bed request before confirming.');
      return;
    }
    try {
      await allocate(selectedRequestId, bed.bed_id);
    } catch (err) {
      setError(err.message || 'Unable to allocate this bed.');
      return;
    }
    onClose();
    await onChanged();
  }

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Assign Bed to Patient"
      subtitle={`Assigning Bed ${bed.bed_number}. Select an incoming patient request:`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
          <button className="btn btn-secondary btn-default" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-default" onClick={confirm}>Confirm Admission</button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Pending Bed Requests</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} id="modal-available-beds">
            {compatible.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', margin: 0, padding: '12px 0' }}>
                No pending bed requests queued for this ward.
              </p>
            ) : (
              compatible.map((r) => {
                const patient = patientsById[r.patient_id] || {};
                const dept = r.pre_request_id ? preRequestsById[r.pre_request_id]?.department : null;
                const selected = selectedRequestId === r.bed_request_id;
                return (
                  <button
                    key={r.bed_request_id}
                    type="button"
                    className="modal-bed-btn"
                    id={'modal-req-' + r.bed_request_id}
                    onClick={() => setSelectedRequestId(r.bed_request_id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-base)',
                      border: '1px solid ' + (selected ? 'var(--primary)' : 'var(--border)'),
                      background: selected ? 'var(--primary-light)' : 'var(--surface)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{patient.name || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      {patient.uhid || '-'} {'•'} {dept || 'General'} {'•'} Priority: {r.priority || 'NORMAL'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div id="assign-bed-error" style={{ display: error ? 'block' : 'none', fontSize: 12, color: 'var(--error)', fontWeight: 500 }}>
          {error}
        </div>
      </div>
    </DialogShell>
  );
}

// ------------------------------------------------- request -> pick a bed --

function RequestFirst({ bedRequestId, data, onClose, onChanged }) {
  const [selectedBedId, setSelectedBedId] = useState(null);

  const request = (data.bedRequests || []).find((r) => r.bed_request_id === bedRequestId);
  if (!request) return null;

  const patient = (data.patients || []).find((p) => p.patient_id === request.patient_id) || {};
  const preRequest = request.pre_request_id
    ? (data.preRequests || []).find((r) => r.pre_request_id === request.pre_request_id)
    : null;
  const ward = request.ward_id ? (data.wards || []).find((w) => w.ward_id === request.ward_id) : null;

  const wardsById = {};
  (data.wards || []).forEach((w) => (wardsById[w.ward_id] = w));

  const availableBeds = (data.beds || []).filter(
    (b) => b.status === 'AVAILABLE' && (!request.ward_id || b.ward_id === request.ward_id),
  );

  async function approve() {
    if (!selectedBedId) {
      toast('Select a bed before approving.', 'warning');
      return;
    }
    try {
      await allocate(bedRequestId, selectedBedId);
    } catch (err) {
      toast(err.message || 'Unable to allocate bed.', 'error');
      // The bed list may be stale (409 = someone else took it); refresh it.
      await onChanged();
      return;
    }
    onClose();
    await onChanged();
  }

  async function reject() {
    try {
      await api.wards.bedRequests.deny(bedRequestId);
    } catch (err) {
      toast(err.message || 'Unable to deny this bed request.', 'error');
      return;
    }
    onClose();
    await onChanged();
  }

  const field = (label, value) => (
    <div>
      <div className="label">{label}</div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );

  return (
    <DialogShell
      open
      onClose={onClose}
      title={`Bed Request — ${patient.name || 'Patient'}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button className="btn btn-secondary btn-default" onClick={onClose}>Cancel</button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-danger btn-default" data-flow="reject-request" onClick={reject}>Reject Request</button>
            <button className="btn btn-primary btn-default" data-flow="approve-assign" id="btn-approve-admit" onClick={approve}>
              Approve &amp; Assign Bed
            </button>
          </div>
        </div>
      }
    >
      <div style={{ gap: 24, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {field('Name', patient.name || '-')}
          {field('UHID', patient.uhid || '-')}
        </div>

        <div style={{ background: 'var(--neutral-bg)', padding: 16, borderRadius: 'var(--radius-base)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div className="label">Department</div>
            <div style={{ marginTop: 4 }}><Badge variant="info">{preRequest?.department || 'General'}</Badge></div>
          </div>
          <div>
            <div className="label">Priority</div>
            <div style={{ marginTop: 4 }}>
              <Badge variant={priorityVariant(request.priority)}>{request.priority || 'NORMAL'}</Badge>
            </div>
          </div>
          {field('Time Waiting', formatDateTime(request.requested_at))}
          {field('Requested By', preRequest ? 'PRE' : 'HOM')}
          <div>
            <div className="label">Suggested Ward</div>
            <div style={{ marginTop: 4 }}>
              {ward ? <Badge variant="success">{ward.ward_name}</Badge> : <span style={{ color: 'var(--text-secondary)' }}>Any ward</span>}
            </div>
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 12, fontSize: 14, textTransform: 'none' }}>Available Beds</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} id="modal-admit-beds">
            {availableBeds.length === 0 ? (
              <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-secondary)' }}>
                No available beds for this request.
              </div>
            ) : (
              availableBeds.map((bed) => (
                <button
                  key={bed.bed_id}
                  type="button"
                  className="bed-option-btn"
                  id={'bed-opt-' + bed.bed_id}
                  onClick={() => setSelectedBedId(bed.bed_id)}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    border: '2px solid ' + (selectedBedId === bed.bed_id ? 'var(--primary)' : 'var(--border)'),
                    background: selectedBedId === bed.bed_id ? 'var(--primary-light)' : 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{bed.bed_number}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {wardsById[bed.ward_id]?.ward_name || ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
