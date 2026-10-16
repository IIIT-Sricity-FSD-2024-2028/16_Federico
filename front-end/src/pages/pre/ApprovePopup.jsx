'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import DialogShell from '../../components/layout/DialogShell.jsx';
import { toast } from '../../components/feedback/feedback.js';
import { sortDoctorsForDepartment, to12Hour, to24Hour, formatDate } from './preHelpers.js';
import { DoctorOptions } from './PrePopup.jsx';
import PatientNotesPreview from './PatientNotesPreview.jsx';

async function checkDoctorAvailability(doctorId, date, time24) {
  const [slots, allAppointments] = await Promise.all([
    api.doctors.availabilityForDoctor(doctorId),
    api.appointments.list(),
  ]);

  const allSlots = slots || [];
  const slotsOnDate = allSlots.filter((s) => String(s.available_date || '').slice(0, 10) === date);

  function toMinutes(t) {
    if (!t) return null;
    const parts = String(t).trim().split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1] || '0', 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  const reqMins = toMinutes(time24);
  const coveredBySlot = slotsOnDate.some((s) => {
    if (String(s.status || 'AVAILABLE').toUpperCase() !== 'AVAILABLE') return false;
    const start = toMinutes(s.start_time);
    const end = toMinutes(s.end_time);
    return start !== null && end !== null && reqMins !== null && reqMins >= start && reqMins < end;
  });

  if (slotsOnDate.length > 0 && !coveredBySlot) {
    return {
      available: false,
      reason: 'Doctor is not available at this time. Please select another time slot.',
    };
  }

  const docId = Number(doctorId);
  const conflict = (allAppointments || []).some((appt) => {
    if (Number(appt.doctor_id) !== docId) return false;
    if (appt.status === 'CANCELLED' || appt.status === 'COMPLETED') return false;

    const apptDate = appt.scheduled_datetime
      ? appt.scheduled_datetime.slice(0, 10)
      : (appt.appointment_date || '').slice(0, 10);
    if (apptDate !== date) return false;

    const rawTime = appt.scheduled_datetime
      ? appt.scheduled_datetime.slice(11, 16)
      : (appt.appointment_time || '').slice(0, 5);
    const apptMins = toMinutes(rawTime);
    return apptMins !== null && reqMins !== null && Math.abs(apptMins - reqMins) < 30;
  });

  if (conflict) {
    return {
      available: false,
      reason: 'Doctor is not available at this time. Please select another time slot.',
    };
  }

  return { available: true, reason: null };
}

/**
 * Modern, clean approval dialog using the shared DialogShell.
 * Gives PRE staff a clear clinical overview with zero emojis,
 * robust doctor availability checks, and a clean, non-overflowing layout.
 */
export default function ApprovePopup({ request, doctors, onClose, onDone }) {
  const [doctorId, setDoctorId] = useState(request?.doctor_id ? String(request.doctor_id) : '');

  // Parse the existing requested_time into components (hour, minute, meridiem)
  function parseInitialTime(rawTime) {
    const t24 = to24Hour(rawTime);
    if (!t24) return { hour: '', minute: '00', meridiem: 'AM' };
    const [h, m] = t24.split(':');
    const hourNum = parseInt(h, 10);
    if (Number.isNaN(hourNum)) return { hour: '', minute: m || '00', meridiem: 'AM' };
    const meridiem = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return { hour: String(hour12), minute: m || '00', meridiem };
  }

  const init = parseInitialTime(request?.requested_time);
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [meridiem, setMeridiem] = useState(init.meridiem);

  const [availError, setAvailError] = useState('');
  const [checking, setChecking] = useState(false);

  if (!request) return null;

  async function confirm() {
    if (!doctorId) {
      toast('Please select an attending doctor', 'error');
      return;
    }

    setAvailError('');

    let time24 = '';
    if (hour) {
      let h = parseInt(hour, 10);
      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      time24 = `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    } else {
      time24 = to24Hour(request.requested_time);
    }

    const date = (request.requested_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10);

    if (!time24) {
      setAvailError('Please select a valid appointment time.');
      return;
    }

    setChecking(true);
    let checkResult;
    try {
      checkResult = await checkDoctorAvailability(doctorId, date, time24);
    } catch (err) {
      checkResult = {
        available: false,
        reason: err.message || 'Doctor is not available at this time. Please select another time slot.',
      };
    } finally {
      setChecking(false);
    }

    if (!checkResult.available) {
      setAvailError(checkResult.reason || 'Doctor is not available at this time. Please select another time slot.');
      return;
    }

    try {
      const payload = {
        status: 'APPROVED',
        doctor_id: Number(doctorId),
        requested_date: date,
      };

      if (hour) {
        const hh = String(hour).padStart(2, '0');
        const mm = String(minute).padStart(2, '0');
        payload.requested_time = `${hh}:${mm} ${meridiem}`;
      } else if (request.requested_time) {
        payload.requested_time = request.requested_time;
      }

      await api.preRequests.update(request.pre_request_id, payload);
      onClose();
      toast('Appointment approved successfully', 'success');
      await onDone();
    } catch (err) {
      toast(err.message || 'Could not approve this request', 'error');
    }
  }

  function handleDoctorChange(e) {
    setDoctorId(e.target.value);
    setAvailError('');
  }
  function handleHourChange(e) {
    setHour(e.target.value);
    setAvailError('');
  }
  function handleMinuteChange(e) {
    setMinute(e.target.value);
    setAvailError('');
  }
  function handleMeridiemChange(e) {
    setMeridiem(e.target.value);
    setAvailError('');
  }

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const dialogFooter = (
    <div className="approve-footer-actions">
      <Button variant="outline" onClick={onClose} disabled={checking}>
        Cancel
      </Button>
      <Button
        variant="primary"
        className="btn-approve-submit"
        onClick={confirm}
        disabled={checking}
      >
        {checking ? (
          <>
            <span className="btn-spinner" aria-hidden="true" />
            <span>Verifying Doctor...</span>
          </>
        ) : (
          <>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Approve Appointment</span>
          </>
        )}
      </Button>
    </div>
  );

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Approve Appointment"
      size="md"
      className="approve-dialog-shell"
      footer={dialogFooter}
    >
      <div className="approve-body-content">
        {/* Patient & Request Overview Card */}
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
            <span className="approve-overview-label">Preferred Time</span>
            <span className="approve-overview-value">
              {request.requested_time ? to12Hour(request.requested_time) || request.requested_time : 'Flexible'}
            </span>
          </div>
        </div>

        {/* Patient Symptoms and Uploaded Documents Preview (rendered when present) */}
        <PatientNotesPreview
          note={request.note}
          documentUrls={request.document_urls}
          hideWhenEmpty={true}
        />

        {/* Doctor Assignment Field */}
        <div className="approve-field-group">
          <label htmlFor="doctorSelect" className="approve-label">
            Attending Doctor <span className="approve-required">*</span>
          </label>
          <div className="approve-select-wrapper">
            <select
              id="doctorSelect"
              className="approve-select"
              value={doctorId}
              onChange={handleDoctorChange}
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

        {/* Appointment Time Selection */}
        <div className="approve-field-group">
          <div className="approve-label-row">
            <label className="approve-label" htmlFor="approveHour">
              Confirmed Time Slot
            </label>
            {request.requested_time && (
              <span className="approve-requested-badge">
                Requested: {to12Hour(request.requested_time) || request.requested_time}
              </span>
            )}
          </div>

          <div className="approve-time-picker-row">
            <div className="approve-time-select-group">
              <select
                id="approveHour"
                value={hour}
                onChange={handleHourChange}
                className="approve-time-select"
                aria-label="Hour"
              >
                <option value="">HH</option>
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}
                  </option>
                ))}
              </select>

              <span className="approve-time-colon" aria-hidden="true">:</span>

              <select
                id="approveMinute"
                value={minute}
                onChange={handleMinuteChange}
                className="approve-time-select"
                aria-label="Minute"
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                id="approveMeridiem"
                value={meridiem}
                onChange={handleMeridiemChange}
                className="approve-time-select approve-meridiem-select"
                aria-label="AM or PM"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>

            {hour && (
              <button
                type="button"
                className="approve-reset-time-btn"
                onClick={() => {
                  setHour(init.hour);
                  setMinute(init.minute);
                  setMeridiem(init.meridiem);
                  setAvailError('');
                }}
                title="Reset to patient's requested slot"
              >
                Reset to Requested
              </button>
            )}
          </div>

          {/* Availability error notification banner */}
          {availError && (
            <div className="approve-error-banner" role="alert">
              <svg
                className="approve-error-icon"
                width="16"
                height="16"
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
              <span>{availError}</span>
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
