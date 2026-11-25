'use strict';


import Button from '../../components/ui/Button.jsx';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { toast } from '../../components/feedback/feedback.js';
import { formatDate, to12Hour } from './preHelpers.js';
import { useAppDispatch, useUiState } from '../../store/hooks.js';
import { updatePreRequest } from '../../store/slices/preRequestsSlice.js';

/**
 * Modern, clean rejection dialog using DialogShell.
 * Ensures PRE staff can clearly communicate clinical reasons with zero emojis.
 */
export default function RejectPopup({ request, onClose, onDone }) {
  const dispatch = useAppDispatch();
  const [reason, setReason] = useUiState('RejectPopup.reason', '');
  const [submitting, setSubmitting] = useUiState('RejectPopup.submitting', false);

  if (!request) return null;

  async function confirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast('Please enter a rejection reason', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(
        updatePreRequest({ id: request.pre_request_id, patch: { status: 'REJECTED', reject_reason: trimmed } }),
      ).unwrap();
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
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
      </div>
    </DialogShell>
  );
}
