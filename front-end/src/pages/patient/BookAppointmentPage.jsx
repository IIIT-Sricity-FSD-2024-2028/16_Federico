'use strict';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from './usePatientStore.js';
import { useSession } from '../../auth/useSession.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import DepartmentSelect from '../../components/forms/DepartmentSelect.jsx';
import {
  ALLOWED_UPLOAD_EXT,
  MAX_UPLOAD_BYTES,
  DUTY_END,
  DUTY_HOURS_LABEL,
  TIME_WINDOWS,
  MAX_ADVANCE_BOOKING_DAYS,
  getBookingDateBounds,
  getMinTimeForDate,
  validateBookingDateString,
  windowFor,
  dutyHoursError,
  formatSlotDate,
  normalizeSlotTime,
  getLocalDateIso,
} from './slotHelpers.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import patientBookAppointmentCss from '../../styles/patient/patient-book-appointment.css?inline';

const TODAY = getLocalDateIso();

const DEFAULT_ERRORS = {
  dept: 'Please select a department.',
  date: 'Please select a date.',
  time: 'Please select a preferred time.',
};

function matchesDoctorDept(doc, target) {
  if (!target) return false;
  const dept = (doc?.department || '').toLowerCase();
  const spec = (doc?.specialization || '').toLowerCase();
  const t = target.toLowerCase();
  return dept === t || spec === t || dept.includes(t) || spec.includes(t);
}

function UploadLabelContent({ files }) {
  if (files.length === 0) {
    return <strong id="upload-label-text">Choose files or drag &amp; drop here</strong>;
  }
  const names = files.map((f) => f.name).join(', ');
  if (files.length === 1) {
    return (
      <strong id="upload-label-text">
        Attached: <span style={{ color: 'var(--primary)' }}>{names}</span> (
        {(files[0].size / 1024).toFixed(0)} KB)
      </strong>
    );
  }
  return (
    <strong id="upload-label-text">
      Attached {files.length} files: <span style={{ color: 'var(--primary)' }}>{names}</span>
    </strong>
  );
}

export default function BookAppointmentPage() {
  usePageStyles(patientBookAppointmentCss);
  useDocumentTitle('Book Appointment – Federico Cloud');
  const navigate = useNavigate();
  const { profile, doctors, specialties, addAppointment } = usePatientStore();
  const { tenant } = useSession();

  const orgDepartments = useMemo(() => {
    if (specialties && specialties.length > 0) return specialties;
    if (tenant?.specialties && tenant.specialties.length > 0) return tenant.specialties;
    return Array.from(
      new Set((doctors || []).map((d) => (d.specialization || d.department || '').trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [specialties, tenant, doctors]);

  const dateBounds = useMemo(() => getBookingDateBounds(TODAY), []);

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedDoctorName, setSelectedDoctorName] = useState('Any Specialist');
  const [slotMetaTouched, setSlotMetaTouched] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitLabel, setSubmitLabel] = useState('Confirm Booking');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  const clearError = (field) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const matchingDoctors = useMemo(() => {
    const orgDoctors = doctors || [];
    if (!selectedDept || selectedDept === 'none') {
      if (orgDepartments.length > 0) {
        const allowed = new Set(orgDepartments.map((s) => s.toLowerCase()));
        const filtered = orgDoctors.filter((d) => {
          const spec = (d.specialization || '').toLowerCase();
          const dept = (d.department || '').toLowerCase();
          return allowed.has(spec) || allowed.has(dept);
        });
        return filtered.length > 0 ? filtered : orgDoctors;
      }
      return orgDoctors;
    }
    return orgDoctors.filter((d) => matchesDoctorDept(d, selectedDept));
  }, [doctors, selectedDept, orgDepartments]);

  function onDepartmentChange(value) {
    setSelectedDept(value || null);
    clearError('dept');
    if (selectedDoctorId) {
      const currentDoc = (doctors || []).find((d) => d.doctor_id === selectedDoctorId);
      if (!matchesDoctorDept(currentDoc, value)) {
        setSelectedDoctorId(null);
        setSelectedDoctorName('Any Specialist');
      }
    }
    setSlotMetaTouched(true);
  }

  function onDoctorChange(value) {
    const id = value ? Number(value) : null;
    setSelectedDoctorId(id);
    if (id) {
      const doc = (doctors || []).find((d) => d.doctor_id === id);
      setSelectedDoctorName(doc ? (doc.name.startsWith('Dr.') ? doc.name : 'Dr. ' + doc.name) : 'Any Specialist');
      if (!selectedDept && doc) {
        const docDept = doc.specialization || doc.department;
        const matched = orgDepartments.find((d) => d.toLowerCase() === (docDept || '').toLowerCase()) || docDept;
        if (matched) {
          setSelectedDept(matched);
          clearError('dept');
          setSlotMetaTouched(true);
        }
      }
    } else {
      setSelectedDoctorName('Any Specialist');
    }
  }

  function onDateChange(value) {
    setSelectedDate(value || null);
    setErrors((e) => ({ ...e, date: undefined, time: undefined }));
    setSlotMetaTouched(true);
  }

  function onTimeChange(value) {
    setSelectedTime(value || '');
    clearError('time');
  }

  function onFilesChange(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setAttachedFiles([]);
      return;
    }

    const rejected = [];
    const accepted = files.filter((file) => {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_UPLOAD_EXT.includes(ext)) {
        rejected.push('"' + file.name + '" — unsupported type (PDF, JPG, PNG only)');
        return false;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        rejected.push('"' + file.name + '" — larger than 5 MB');
        return false;
      }
      return true;
    });

    rejected.forEach((msg) => toast(msg, 'warning'));
    setAttachedFiles(accepted);

    if (accepted.length > 0) {
      const names = accepted.map((f) => f.name).join(', ');
      toast(
        accepted.length === 1
          ? 'File "' + names + '" attached to appointment.'
          : accepted.length + ' files attached to appointment.',
        'success',
      );
    }
  }

  function validateForm() {
    const next = {};
    if (!selectedDept || selectedDept === 'none') next.dept = DEFAULT_ERRORS.dept;
    const dateError = validateBookingDateString(selectedDate, dateBounds);
    if (dateError) next.date = dateError;
    if (!selectedTime) {
      next.time = DEFAULT_ERRORS.time;
    } else if (selectedDate && !next.date) {
      const dutyError = dutyHoursError(selectedDate, selectedTime);
      if (dutyError) next.time = dutyError;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onConfirm() {
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitLabel('Submitting Request…');

    try {
      const documentUrls = [];
      if (attachedFiles.length > 0) {
        setSubmitLabel(
          'Uploading ' + attachedFiles.length + ' document' + (attachedFiles.length > 1 ? 's' : '') + '…',
        );
        for (const file of attachedFiles) {
          const uploaded = await api.uploads.document(file);
          const url = (uploaded && uploaded.file && uploaded.file.url) || (uploaded && uploaded.url);
          if (!url) throw new Error('Upload of "' + file.name + '" did not return a file URL.');
          documentUrls.push(url);
        }
        setSubmitLabel('Submitting Request…');
      }

      const attachedNames = attachedFiles.map((f) => f.name).join(', ');
      const newRequestId = await addAppointment({
        date: selectedDate,
        displayDate: formatSlotDate(selectedDate),
        time: normalizeSlotTime(selectedTime),
        department: selectedDept,
        doctorId: selectedDoctorId,
        type: 'Consultation',
        note: attachedNames ? 'Attached: ' + attachedNames : undefined,
        documents: documentUrls,
      });

      setBooked(true);
      setSubmitLabel('Booked ✓');
      toast('Appointment request submitted! Reference #' + newRequestId, 'success');

      setTimeout(() => {
        navigate('/Patient/patient-dashboard.html');
      }, 1500);
    } catch (err) {
      setSubmitting(false);
      setSubmitLabel('Confirm Booking');
      toast(err?.message || 'Could not schedule appointment. Please try again.', 'warning');
    }
  }

  function onSaveDraft() {
    if (!selectedDept && !selectedDate && !selectedTime) {
      toast('Select at least a department or date to save draft.', 'info');
      return;
    }
    toast('Appointment draft saved. Complete booking when ready.', 'info');
  }

  const slotMeta = slotMetaTouched
    ? (selectedDate ? formatSlotDate(selectedDate) : 'No date selected') +
      ' · ' +
      (selectedDept && selectedDept !== 'none' ? selectedDept : 'No department')
    : 'Select department and date above';

  const minTimeForSelectedDate = getMinTimeForDate(selectedDate);

  return (
    <main className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          className="breadcrumb-link"
          id="breadcrumb-home"
          onClick={() => navigate('/Patient/patient-dashboard.html')}
        >
          Dashboard
        </button>
        <span aria-hidden="true">›</span>
        <span>Book Appointment</span>
      </nav>

      <section className="page-heading">
        <h1>Book an Appointment</h1>
        <p>
          Select your preferred department, date, and time. Our pre-registration team (PRE) will
          confirm your booking promptly.
        </p>
      </section>

      <section className="layout">
        <div className="main-column">
          <section className="panel">
            <div className="panel-head">
              <h2>1. Select Department &amp; Date</h2>
            </div>
            <div className="filter-grid">
              <div className="form-group">
                <label htmlFor="department">
                  Department <span className="req">*</span>
                </label>
                <DepartmentSelect
                  id="department"
                  departments={orgDepartments}
                  doctors={doctors}
                  value={selectedDept ?? ''}
                  onChange={onDepartmentChange}
                  placeholder="Select department"
                />
                <span className={'field-error' + (errors.dept ? '' : ' hidden')} id="error-dept">
                  {errors.dept || DEFAULT_ERRORS.dept}
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="doctor-select">Doctor / Specialist</label>
                <select
                  id="doctor-select"
                  value={selectedDoctorId ?? ''}
                  onChange={(e) => onDoctorChange(e.target.value)}
                >
                  <option value="">Any Available Specialist</option>
                  {matchingDoctors.map((doc) => {
                    const docTitle = doc.name.startsWith('Dr.') ? doc.name : 'Dr. ' + doc.name;
                    return (
                      <option key={doc.doctor_id} value={doc.doctor_id}>
                        {docTitle} ({doc.specialization || doc.department || selectedDept || 'Specialist'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="appointment-date">
                  Preferred Date <span className="req">*</span>
                </label>
                <input
                  id="appointment-date"
                  type="date"
                  min={dateBounds.minDate}
                  max={dateBounds.maxDate}
                  value={selectedDate ?? ''}
                  onChange={(e) => onDateChange(e.target.value)}
                />
                <div className="form-hint" style={{ fontSize: 12, color: 'var(--color-muted-fg)', marginTop: 4 }}>
                  Appointments can be scheduled up to {MAX_ADVANCE_BOOKING_DAYS} days in advance.
                </div>
                <span className={'field-error' + (errors.date ? '' : ' hidden')} id="error-date">
                  {errors.date || DEFAULT_ERRORS.date}
                </span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head panel-head-between">
              <h2>2. Preferred Time</h2>
              <span className="panel-meta" id="slot-meta">
                {slotMeta}
              </span>
            </div>

            <div className="filter-grid">
              <div className="form-group">
                <label htmlFor="appointment-time">
                  Preferred Time <span className="req">*</span>
                </label>
                <input
                  id="appointment-time"
                  type="time"
                  min={minTimeForSelectedDate}
                  max={DUTY_END}
                  step="900"
                  value={selectedTime}
                  onChange={(e) => onTimeChange(e.target.value)}
                />
                <span className={'field-error' + (errors.time ? '' : ' hidden')} id="error-time">
                  {errors.time || DEFAULT_ERRORS.time}
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="time-window">Time of Day</label>
                <select
                  id="time-window"
                  value={selectedTime ? windowFor(selectedTime) : ''}
                  onChange={(e) => {
                    const win = TIME_WINDOWS.find((w) => w.id === e.target.value);
                    if (win) onTimeChange(win.pick);
                  }}
                >
                  <option value="">Any time</option>
                  {TIME_WINDOWS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="panel-meta" style={{ margin: '0 0 20px' }}>
              Doctors are on duty {DUTY_HOURS_LABEL}. Our reception team (PRE) will assign an
              available doctor and confirm your exact time.
            </p>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>3. Medical Documents</h2>
              <span className="muted-tag">Optional</span>
            </div>
            <div className="file-section">
              <label className="section-label">Upload Previous Prescriptions / Lab Reports</label>
              <label className="upload-box" htmlFor="file-upload" id="upload-label">
                <UploadLabelContent files={attachedFiles} />
                <small>
                  Attach previous prescriptions, discharge notes, or lab test reports (PDF, JPG, PNG up
                  to 5 MB)
                </small>
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  style={{ display: 'none' }}
                  onChange={onFilesChange}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className="panel side-panel">
            <div className="panel-head">
              <h2>Patient Details</h2>
            </div>
            <div className="profile-head">
              <div className="profile-avatar" id="sidebar-initials">
                {profile ? profile.initials || '--' : '--'}
              </div>
              <div className="profile-meta">
                <strong id="sidebar-name">{profile ? profile.name || 'Patient' : 'Loading...'}</strong>
                <span id="sidebar-uhid">UHID: {profile ? profile.uhid || '--' : '--'}</span>
              </div>
            </div>
            <div className="details-grid">
              <div className="label">Age / Gender</div>
              <div className="value" id="sidebar-age-gender">
                {profile ? (profile.age ? profile.age + ' yrs' : '--') + ' / ' + (profile.gender || '--') : '--'}
              </div>
              <div className="label">Blood Group</div>
              <div className="value" id="sidebar-blood">
                {profile ? profile.bloodGroup || '--' : '--'}
              </div>
              <div className="label">Contact</div>
              <div className="value" id="sidebar-phone">
                {profile ? profile.phone || '--' : '--'}
              </div>
              <div className="label">Insurance</div>
              <div className="value">
                <span className="verify-badge" id="sidebar-ins-status">
                  {profile ? (profile.insurance && profile.insurance.verified ? 'Verified' : 'Unverified') : '--'}
                </span>
              </div>
              <div className="label">Provider</div>
              <div className="value" id="sidebar-ins-provider">
                {profile ? (profile.insurance && profile.insurance.provider) || 'Self Pay' : '--'}
              </div>
            </div>
          </section>

          <section className="panel side-panel selected-slot">
            <div className="panel-head">
              <h2>Selected Slot</h2>
            </div>
            <div className="details-grid">
              <div className="label">Date</div>
              <div className="value" id="slot-date">
                {selectedDate ? formatSlotDate(selectedDate) : '—'}
              </div>
              <div className="label">Time</div>
              <div className="value" id="slot-time">
                {selectedTime ? normalizeSlotTime(selectedTime) : '—'}
              </div>
              <div className="label">Department</div>
              <div className="value" id="slot-dept">
                {selectedDept && selectedDept !== 'none' ? selectedDept : '—'}
              </div>
              <div className="label">Doctor</div>
              <div className="value" id="slot-doctor">
                {selectedDoctorName || 'Any Specialist'}
              </div>
              <div className="label">Visit Type</div>
              <div className="value" id="slot-visit">
                Consultation
              </div>
            </div>
            <div className="fee-row">
              <span>Consultation Fee</span>
              <strong>₹500</strong>
            </div>
          </section>

          <div className="action-stack">
            <button
              className="confirm-btn"
              type="button"
              id="confirm-booking"
              disabled={submitting}
              style={booked ? { opacity: '0.7' } : undefined}
              onClick={onConfirm}
            >
              {submitLabel}
            </button>
            <button className="draft-btn" type="button" id="save-draft" onClick={onSaveDraft}>
              Save as Draft
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
