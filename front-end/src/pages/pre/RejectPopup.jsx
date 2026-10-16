'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { toast } from '../../components/feedback/feedback.js';
import { formatDate, to12Hour } from './preHelpers.js';

/**
 * Modern, clean rejection dialog using DialogShell.
 * Ensures PRE staff can clearly communicate clinical reasons with zero emojis.
 */
export default function RejectPopup({ request, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!request) return null;

  async function confirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast('Please enter a rejection reason', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.preRequests.update(request.pre_request_id, {
        status: 'REJECTED',
        reject_reason: trimmed,
      });
      onClose();
      toast('Request rejected successfully', 'success');
      await onDone();
    } catch (err) {
      toast(err.message || 'Could not reject this request', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const dialogFooter = (
    <div className="approve-footer-actions">
      <Button variant="outline" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <Button
        variant="danger"
        onClick={confirm}
        disabled={submitting}
      >
        {submitting ? 'Rejecting...' : 'Reject Request'}
      </Button>
    </div>
  );

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Reject Appointment Request"
      subtitle="Provide a clear, clinical reason so the patient understands why their request cannot be accommodated."
      size="md"
      className="approve-dialog-shell"
      footer={dialogFooter}
    >
      <div className="approve-body-content">
        {/* Overview card */}
        <div className="approve-overview-card">
          <div className="approve-overview-item">
            <span className="approve-overview-label">Patient</span>
            <span className="approve-overview-value" title={request.patientName}>
              {request.patientName || 'Patient'}
            </span>
            {(request.patientAge || request.patientGender) && (
              <span className="approve-overview-sub">
                {[request.patientAge ? `${request.patientAge}y` : null, request.patientGender]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            )}
          </div>
          <div className="approve-overview-item">
            <span className="approve-overview-label">Department</span>
            <span className="approve-overview-value">{request.department || 'General'}</span>
          </div>
          <div className="approve-overview-item">
            <span className="approve-overview-label">Requested Date</span>
            <span className="approve-overview-value">
              {formatDate(request.requested_date) || request.requested_date || '—'}
            </span>
          </div>
          <div className="approve-overview-item">
            <span className="approve-overview-label">Requested Time</span>
            <span className="approve-overview-value">
              {request.requested_time ? to12Hour(request.requested_time) || request.requested_time : 'Flexible'}
            </span>
          </div>
        </div>

        {/* Reason Field */}
        <div className="approve-field-group">
          <label htmlFor="rejectReason" className="approve-label">
            Rejection Reason <span className="approve-required">*</span>
          </label>
          <textarea
            id="rejectReason"
            className="approve-textarea"
            placeholder="e.g. Doctor is unavailable for the selected slot, specialist referral required, or please reschedule to next week..."
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <span className="approve-help-text">
            This reason will be visible to the patient in their appointment history.
          </span>
        </div>
      </div>
    </DialogShell>
  );
}
