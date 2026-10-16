'use strict';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useSearchParam } from '../../hooks/useSearchParam.js';
import { useSession } from '../../auth/useSession.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import DepartmentSelect from '../../components/forms/DepartmentSelect.jsx';
import { toast } from '../../components/feedback/feedback.js';
import { formatAge, to12Hour } from './preHelpers.js';
import { getBookingDateBounds } from '../patient/slotHelpers.js';
import RegisterWalkInPopup from './RegisterWalkInPopup.jsx';
import SearchResultPopup from './SearchResultPopup.jsx';

/**
 * Ported from PRE/pages/APPointment.html + js/Appointment.js.
 *
 * Reached at /PRE/pages/appointment.html - the spelling every link in the app
 * uses. The uppercase filename also routes here (DEC-7).
 */
const TIME_SLOTS = [
  ['09:00 AM', '09:00 AM – Morning'],
  ['10:00 AM', '10:00 AM – Morning'],
  ['11:30 AM', '11:30 AM – Morning'],
  ['02:00 PM', '02:00 PM – Afternoon'],
  ['03:30 PM', '03:30 PM – Afternoon'],
  ['05:00 PM', '05:00 PM – Evening'],
];

function toMinutes(t) {
  if (!t) return null;
  const clean = String(t).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function toPickerShape(patient) {
  return {
    patientId: patient.uhid || 'UHID-' + patient.patient_id,
    realId: patient.patient_id,
    name: patient.name,
    age: formatAge(patient.dob),
    gender: patient.gender || '—',
    phone: patient.phone || '—',
    address: patient.address || '—',
  };
}

export default function AppointmentPage() {
  useDocumentTitle('Create Appointment – Federico PRE');
  const { tenant } = useSession();
  const orgId = tenant?.organization_id;
  const dateBounds = useMemo(() => getBookingDateBounds(), []);

  const patientIdParam = useSearchParam('patient_id');
  const doctorIdParam = useSearchParam('doctor_id');

  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  const [department, setDepartment] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00 AM');
  const [reason, setReason] = useState('');

  const { data, reload } = useApi(async () => {
    const [patients, doctors, availabilities] = await Promise.all([
      api.patients.list().catch(() => []),
      api.doctors.list().catch(() => []),
      api.doctors.availabilityAll().catch(() => []),
    ]);
    return { patients: patients || [], doctors: doctors || [], availabilities: availabilities || [] };
  }, []);

  // Scoped to the active tenant organization
  const orgPatients = useMemo(() => {
    const list = orgId
      ? (data?.patients || []).filter((p) => !p.organization_id || Number(p.organization_id) === Number(orgId))
      : (data?.patients || []);
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [data?.patients, orgId]);

  const orgDoctors = useMemo(() => {
    return orgId
      ? (data?.doctors || []).filter((d) => !d.organization_id || Number(d.organization_id) === Number(orgId))
      : (data?.doctors || []);
  }, [data?.doctors, orgId]);

  const orgAvailabilities = useMemo(() => {
    return orgId
      ? (data?.availabilities || []).filter((a) => !a.organization_id || Number(a.organization_id) === Number(orgId))
      : (data?.availabilities || []);
  }, [data?.availabilities, orgId]);

  const orgDepartments = useMemo(() => {
    return Array.from(
      new Set(orgDoctors.map((d) => (d.department || d.specialization || '').trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [orgDoctors]);

  const getDoctorDutyHours = useCallback((docId, selectedDateIso) => {
    const dId = Number(docId);
    if (!dId) return null;

    if (selectedDateIso) {
      const dateKey = String(selectedDateIso).slice(0, 10);
      const slotOnDate = orgAvailabilities.find(
        (a) => Number(a.doctor_id) === dId && String(a.available_date || '').slice(0, 10) === dateKey,
      );
      if (slotOnDate && slotOnDate.start_time && slotOnDate.end_time) {
        return {
          start: slotOnDate.start_time,
          end: slotOnDate.end_time,
          label: to12Hour(slotOnDate.start_time) + ' – ' + to12Hour(slotOnDate.end_time),
          status: slotOnDate.status || 'Available',
        };
      }
    }

    const anySlot = orgAvailabilities.find((a) => Number(a.doctor_id) === dId && a.start_time && a.end_time);
    if (anySlot) {
      return {
        start: anySlot.start_time,
        end: anySlot.end_time,
        label: to12Hour(anySlot.start_time) + ' – ' + to12Hour(anySlot.end_time),
        status: anySlot.status || 'Available',
      };
    }

    return {
      start: '09:00:00',
      end: '17:00:00',
      label: '09:00 AM – 05:00 PM',
      status: 'Available',
    };
  }, [orgAvailabilities]);

  // ?patient_id= / ?doctor_id= prefill, once the catalogs have loaded.
  useEffect(() => {
    if (!data) return;
    if (patientIdParam) {
      const matched = orgPatients.find((p) => p.patient_id === Number(patientIdParam));
      if (matched) fillPatient(toPickerShape(matched));
    }
    if (doctorIdParam) {
      const doc = orgDoctors.find((d) => d.doctor_id === Number(doctorIdParam));
      if (doc) {
        setDepartment(doc.specialization || doc.department || '');
        setDoctorId(String(doc.doctor_id));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function fillPatient(shape) {
    setSelected(shape);
    setPickerQuery(shape.name + ' (' + shape.patientId + ')');
    setPickerOpen(false);
  }

  function clearForm() {
    setSelected(null);
    setPickerQuery('');
    setSearchPhone('');
    setDepartment('');
    setDoctorId('');
    setDate('');
    setTime('10:00 AM');
    setReason('');
    setPickerOpen(false);
  }

  const matchingDoctors = useMemo(() => {
    if (!department) return orgDoctors;
    const target = department.toLowerCase();
    return orgDoctors.filter((d) => {
      const docDept = (d.department || '').toLowerCase();
      const docSpec = (d.specialization || '').toLowerCase();
      return docDept === target || docSpec === target || docSpec.includes(target) || docDept.includes(target);
    });
  }, [orgDoctors, department]);

  const availableTimeSlots = useMemo(() => {
    if (!doctorId) return TIME_SLOTS;
    const duty = getDoctorDutyHours(doctorId, date);
    if (!duty) return TIME_SLOTS;
    const startMins = toMinutes(duty.start) ?? 540;
    const endMins = toMinutes(duty.end) ?? 1020;

    const matched = TIME_SLOTS.filter(([slotVal]) => {
      const m = toMinutes(slotVal);
      return m !== null && m >= startMins && m < endMins;
    });

    if (matched.length === 0 && duty.start) {
      const customVal = to12Hour(duty.start);
      return [[customVal, `${customVal} – Doctor Duty Shift (${duty.label})`]];
    }
    return matched;
  }, [doctorId, date, getDoctorDutyHours]);

  function handleDepartmentChange(dept) {
    setDepartment(dept);
    if (doctorId) {
      const currentDoc = orgDoctors.find((d) => String(d.doctor_id) === String(doctorId));
      if (currentDoc) {
        const target = (dept || '').toLowerCase();
        const docDept = (currentDoc.department || '').toLowerCase();
        const docSpec = (currentDoc.specialization || '').toLowerCase();
        if (!target || !(docDept === target || docSpec === target || docSpec.includes(target) || docDept.includes(target))) {
          setDoctorId('');
        }
      }
    }
  }

  function handleDoctorChange(e) {
    const docId = e.target.value;
    setDoctorId(docId);
    if (docId) {
      const doc = orgDoctors.find((d) => String(d.doctor_id) === String(docId));
      if (doc) {
        const docDept = doc.specialization || doc.department || '';
        if (docDept) setDepartment(docDept);

        const duty = getDoctorDutyHours(doc.doctor_id, date);
        if (duty) {
          const startMins = toMinutes(duty.start) ?? 540;
          const endMins = toMinutes(duty.end) ?? 1020;
          const currentMins = toMinutes(time);
          if (currentMins === null || currentMins < startMins || currentMins >= endMins) {
            const valid = TIME_SLOTS.find(([slotVal]) => {
              const m = toMinutes(slotVal);
              return m !== null && m >= startMins && m < endMins;
            });
            if (valid) setTime(valid[0]);
            else if (duty.start) setTime(to12Hour(duty.start));
          }
        }
      }
    }
  }

  function handleDateChange(newDate) {
    setDate(newDate);
    if (doctorId) {
      const duty = getDoctorDutyHours(doctorId, newDate);
      if (duty) {
        const startMins = toMinutes(duty.start) ?? 540;
        const endMins = toMinutes(duty.end) ?? 1020;
        const currentMins = toMinutes(time);
        if (currentMins === null || currentMins < startMins || currentMins >= endMins) {
          const valid = TIME_SLOTS.find(([slotVal]) => {
            const m = toMinutes(slotVal);
            return m !== null && m >= startMins && m < endMins;
          });
          if (valid) setTime(valid[0]);
          else if (duty.start) setTime(to12Hour(duty.start));
        }
      }
    }
  }

  const q = pickerQuery.trim().toLowerCase();
  const pickerMatches = useMemo(() => {
    const list = orgPatients.map(toPickerShape);
    if (!q) return list;
    if (selected && q === (selected.name + ' (' + selected.patientId + ')').toLowerCase()) {
      return list;
    }
    return list.filter((p) => [p.patientId, p.name, p.phone].join(' ').toLowerCase().includes(q));
  }, [orgPatients, q, selected]);

  /** Matches UHID, phone number, or name. */
  function searchPatient() {
    const rawQuery = searchPhone.trim();
    if (!rawQuery) {
      toast('Enter patient name, phone number, or UHID to search', 'error');
      return;
    }
    const cleanPhone = rawQuery.replace(/\D/g, '');
    const lowerQuery = rawQuery.toLowerCase();

    let found = orgPatients.find((p) => {
      const uhid = (p.uhid || '').toLowerCase();
      return uhid === lowerQuery || uhid.endsWith(lowerQuery);
    });

    if (!found && cleanPhone && cleanPhone.length >= 4) {
      found = orgPatients.find((p) => {
        const pPhone = (p.phone || '').replace(/\D/g, '');
        return pPhone.endsWith(cleanPhone) || pPhone === cleanPhone;
      });
    }

    if (!found) {
      found = orgPatients.find((p) => (p.name || '').toLowerCase().includes(lowerQuery));
    }

    if (found) {
      const shape = toPickerShape(found);
      fillPatient(shape);
      setSearchResult(shape);
      toast(`Patient record found: ${shape.name} (${shape.patientId})`, 'success');
    } else {
      toast(`No verified patient found matching "${rawQuery}"`, 'error');
    }
  }

  async function createAppointment() {
    if (!selected) {
      toast('Please select a verified patient from the directory first', 'error');
      return;
    }
    if (!date || !department) {
      toast('Please select appointment date and clinical department', 'error');
      return;
    }
    if (date < dateBounds.minDate || date > dateBounds.maxDate) {
      toast(`Appointment date must be between today and ${dateBounds.maxDays} days in advance`, 'error');
      return;
    }
    try {
      // `appointment_time` and `status` are not in createPreRequestRules, but
      // the validator does not strip unknown fields, so both reach the service.
      const result = await api.preRequests.create({
        patient_id: selected.realId,
        department,
        doctor_id: doctorId ? Number(doctorId) : null,
        visit_type: 'Consultation',
        requested_date: date,
        requested_time: time,
        appointment_time: time,
        note: reason.trim() || undefined,
        status: 'APPROVED',
      });
      toast('Appointment scheduled successfully (Ref #' + result.pre_request_id + ')', 'success');
      clearForm();
    } catch (err) {
      toast(err.message || 'Could not create appointment', 'error');
    }
  }

  return (
    <>
      <div className="container" style={{ maxWidth: 1080, margin: '0 auto' }}>
        <PageHeader
          title="Schedule Patient Appointment"
          actions={
            <Button variant="primary" className="green directory-action-btn" type="button" onClick={() => setRegisterOpen(true)}>
              + Register Walk-In Patient
            </Button>
          }
        />

        <div className="appointment-grid">
          <div className="appointment-card-section">
            <h3 className="appointment-section-title">1. Patient Identification</h3>

            <div className="appointment-form-group">
              <label className="emergency-form-label" htmlFor="searchPhone">Quick Search by Name, Phone Number, or UHID</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  id="searchPhone"
                  placeholder="Enter patient name, 10-digit phone, or UHID..."
                  className="emergency-form-control"
                  style={{ flex: 1 }}
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      searchPatient();
                    }
                  }}
                  onFocus={() => setPickerOpen(false)}
                />
                <Button
                  variant="secondary"
                  className="suggest"
                  type="button"
                  onClick={searchPatient}
                  style={{ height: 40, padding: '0 16px', margin: 0, borderRadius: 'var(--radius-sm, 6px)' }}
                >
                  Search
                </Button>
              </div>
            </div>

            <div className="appointment-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="emergency-form-label" htmlFor="patientId" style={{ margin: 0 }}>
                  Select from Patient Directory ({orgPatients.length} Patients)
                </label>
                {selected && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setPickerQuery('');
                      setPickerOpen(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--md-primary, #0f766e)',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              <div className={'appointment-patient-picker' + (pickerOpen ? ' is-open' : '')} id="appointmentPatientPicker">
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="patientId"
                    placeholder="Click to browse all or type name, UHID, phone..."
                    autoComplete="off"
                    className="emergency-form-control"
                    style={{ paddingRight: selected ? 32 : undefined }}
                    value={pickerQuery}
                    onFocus={() => setPickerOpen(true)}
                    onClick={() => setPickerOpen(true)}
                    onChange={(e) => {
                      setPickerQuery(e.target.value);
                      setSelected(null);
                      setPickerOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setPickerOpen(false);
                    }}
                    onBlur={() => setTimeout(() => setPickerOpen(false), 200)}
                  />
                  {selected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(null);
                        setPickerQuery('');
                        setPickerOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-muted-fg)',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: 4,
                      }}
                      title="Clear patient selection"
                      aria-label="Clear patient selection"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="appointment-picker-dropdown" id="appointmentPatientDropdown" hidden={!pickerOpen}>
                  {pickerMatches.length === 0 ? (
                    <div className="appointment-picker-empty">
                      <strong>No matching records found</strong>
                      <span>Click &quot;+ Register Walk-In Patient&quot; above to add a new patient profile.</span>
                    </div>
                  ) : (
                    pickerMatches.map((p) => (
                      <button
                        key={p.patientId}
                        type="button"
                        className="appointment-picker-option"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          fillPatient(p);
                        }}
                      >
                        <div className="appointment-picker-row">
                          <strong>{p.name}</strong>
                          <span style={{ fontSize: 11, color: 'var(--md-primary, #0f766e)', fontWeight: 600 }}>{p.patientId}</span>
                        </div>
                        <div className="appointment-picker-row appointment-picker-meta">
                          <span>{p.age} {'•'} {p.gender}</span>
                          <span>{p.phone}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="appointment-picker-helper">
                Select verified patient from the organization directory or search by name / phone.
              </div>
            </div>

            <div id="selectedPatientCard" className="quick-patient-box" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                {/* fillPatientForm() applied a per-field fallback to every one
                    of these, so a record missing a name still reads "Verified
                    Patient" rather than going blank. */}
                <strong id="cardPatientName" style={{ fontSize: 15, color: 'var(--color-fg)' }}>
                  {selected ? selected.name || 'Verified Patient' : 'No Patient Selected'}
                </strong>
                <Badge variant="neutral" id="cardPatientUhid">
                  {selected ? selected.patientId || 'UHID' : '—'}
                </Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div><span style={{ color: 'var(--color-muted-fg)' }}>Age / Gender:</span> <strong id="cardPatientAgeGender">{selected ? (selected.age || '—') + ' / ' + (selected.gender || '—') : '—'}</strong></div>
                <div><span style={{ color: 'var(--color-muted-fg)' }}>Contact:</span> <strong id="cardPatientPhone">{selected ? selected.phone || '—' : '—'}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--color-muted-fg)' }}>Address:</span> <strong id="cardPatientAddress">{selected ? selected.address || '—' : '—'}</strong></div>
              </div>
            </div>
          </div>

          <div className="appointment-card-section">
            <h3 className="appointment-section-title">2. Clinical &amp; Scheduling Details</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="appointment-form-group">
                <label className="emergency-form-label" htmlFor="department">Specialty Department *</label>
                <DepartmentSelect
                  id="department"
                  className="emergency-form-control"
                  departments={orgDepartments}
                  doctors={orgDoctors}
                  value={department}
                  placeholder="Select Department"
                  onChange={handleDepartmentChange}
                />
              </div>

              <div className="appointment-form-group">
                <label className="emergency-form-label" htmlFor="doctorSelect">Attending Physician</label>
                <select id="doctorSelect" className="emergency-form-control" value={doctorId} onChange={handleDoctorChange}>
                  <option value="">Any Available Specialist</option>
                  {matchingDoctors.map((d) => {
                    const duty = getDoctorDutyHours(d.doctor_id, date);
                    const timeHint = duty ? ' (' + duty.label + ')' : '';
                    const title = d.name.startsWith('Dr.') ? d.name : 'Dr. ' + d.name;
                    return (
                      <option key={d.doctor_id} value={d.doctor_id}>
                        {title} (DOC-{String(d.doctor_id).padStart(3, '0')}){timeHint}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="appointment-form-group">
                <label className="emergency-form-label" htmlFor="appointmentDate">Appointment Date *</label>
                <input
                  type="date"
                  id="appointmentDate"
                  className="emergency-form-control"
                  min={dateBounds.minDate}
                  max={dateBounds.maxDate}
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              <div className="appointment-form-group">
                <label className="emergency-form-label" htmlFor="appointmentTime">Preferred Time Slot *</label>
                <select
                  id="appointmentTime"
                  className="emergency-form-control"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                >
                  {availableTimeSlots.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="appointment-form-group">
              <label className="emergency-form-label" htmlFor="appointmentReason">Chief Complaint / Notes</label>
              <input type="text" id="appointmentReason" placeholder="e.g. Routine checkup, follow-up..." className="emergency-form-control"
                value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button variant="secondary" className="suggest" type="button" onClick={clearForm} style={{ height: 44, padding: '0 20px', borderRadius: 'var(--radius-sm, 6px)' }}>
                Clear Form
              </Button>
              <Button variant="primary" className="green" type="button" onClick={createAppointment} style={{ height: 44, padding: '0 24px', borderRadius: 'var(--radius-sm, 6px)', fontSize: 13, fontWeight: 600 }}>
                Confirm &amp; Schedule Appointment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <RegisterWalkInPopup
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={async (patient) => {
          await reload();
          fillPatient(toPickerShape(patient));
        }}
      />

      <SearchResultPopup patient={searchResult} onClose={() => setSearchResult(null)} />
    </>
  );
}

