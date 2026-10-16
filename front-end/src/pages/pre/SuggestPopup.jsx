'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { toast } from '../../components/feedback/feedback.js';
import { sortDoctorsForDepartment, to12Hour, to24Hour, formatDate } from './preHelpers.js';
import { DoctorOptions } from './PrePopup.jsx';
import { getBookingDateBounds } from '../patient/slotHelpers.js';
import PatientNotesPreview from './PatientNotesPreview.jsx';

/**
 * Modern, clean reschedule & slot suggestion dialog using DialogShell.
 * Adheres to clinical UI standards, zero emojis, and the 14-day booking constraint.
 */
export default function SuggestPopup({ request, doctors, onClose, onDone }) {
  const [doctorId, setDoctorId] = useState(request?.doctor_id ? String(request.doctor_id) : '');
  const [newDate, setNewDate] = useState(request?.requested_date || '');
  const [time, setTime] = useState(to24Hour(request?.requested_time));
  const [submitting, setSubmitting] = useState(false);

  const bounds = getBookingDateBounds();

  if (!request) return null;

  async function confirm() {
    if (!newDate || !doctorId) {
      toast('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const fieldPatch = { requested_date: newDate, doctor_id: Number(doctorId) };
      if (time) fieldPatch.requested_time = to12Hour(time);
      await api.preRequests.update(request.pre_request_id, fieldPatch);
      if (request.status === 'PENDING') {
        await api.preRequests.update(request.pre_request_id, { status: 'APPROVED' });
      }
      onClose();
      toast('Slot rescheduled and approved successfully', 'success');
      await onDone();
    } catch (err) {
      toast(err.message || 'Could not reschedule this request', 'error');
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
        variant="primary"
        className="btn-approve-submit"
        onClick={confirm}
        disabled={submitting}
      >
        {submitting ? 'Updating...' : 'Confirm Reschedule'}
      </Button>
    </div>
  );

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Suggest New Slot"
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
            <span className="approve-overview-label">Original Date</span>
            <span className="approve-overview-value">
              {formatDate(request.requested_date) || request.requested_date || '—'}
            </span>
          </div>
          <div className="approve-overview-item">
            <span className="approve-overview-label">Original Slot</span>
            <span className="approve-overview-value">
              {request.requested_time ? to12Hour(request.requested_time) || request.requested_time : 'Flexible'}
            </span>
          </div>
        </div>

        {/* Patient Notes & Documents (when present) */}
        <PatientNotesPreview
          note={request.note}
          documentUrls={request.document_urls}
          hideWhenEmpty={true}
        />

        {/* Doctor Assignment */}
        <div className="approve-field-group">
          <label htmlFor="suggestDoctorSelect" className="approve-label">
            Attending Doctor <span className="approve-required">*</span>
          </label>
          <div className="approve-select-wrapper">
            <select
              id="suggestDoctorSelect"
              className="approve-select"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
            >
              <DoctorOptions doctors={doctors} department={request.department} sortFn={sortDoctorsForDepartment} />
            </select>
            <svg
              className="approve-select-chevron"
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Date and Time Pickers in a clean 2-column layout */}
        <div className="suggest-date-time-grid">
          <div className="approve-field-group">
            <label htmlFor="newDate" className="approve-label">
              New Date <span className="approve-required">*</span>
            </label>
            <input
              type="date"
              id="newDate"
              className="approve-date-input"
              value={newDate}
              min={bounds.minDate}
              max={bounds.maxDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div className="approve-field-group">
            <label htmlFor="appointTime" className="approve-label">
              New Time Slot
            </label>
            <input
              type="time"
              id="appointTime"
              className="approve-date-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
