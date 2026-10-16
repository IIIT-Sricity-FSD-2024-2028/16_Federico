'use strict';

import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/layout/Modal.jsx';
import { statusLabel, formatDate, to12Hour } from './preHelpers.js';

/**
 * Ported from #patientHistoryModal plus viewPatient360 in
 * PRE/js/patient-records.js.
 *
 * Encounters merge pre-requests and appointments, de-duplicated on
 * apt_<appointment_id> / pr_<pre_request_id> so a pre-request that produced an
 * appointment is not listed twice.
 */
export default function Patient360Modal({ patient, doctorsById, bedsById, onClose }) {
  if (!patient) return null;

  const seen = new Set();
  const encounters = [...(patient.preRequests || []), ...(patient.appointments || [])].filter((enc, i) => {
    const key = enc.appointment_id
      ? 'apt_' + enc.appointment_id
      : enc.pre_request_id
        ? 'pr_' + enc.pre_request_id
        : 'enc_' + (enc.id || i);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const headerCell = (label, value, color) => (
    <div>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-muted-fg)', textTransform: 'uppercase' }}>{label}</span>
      <strong style={color ? { color, fontSize: 14 } : undefined}>{value}</strong>
    </div>
  );

  return (
    <Modal open={Boolean(patient)} onClose={onClose} className="popup" labelledBy="historyModalTitle">
      <div id="patientHistoryModal" style={{ display: 'contents' }}>
        <div className="emergency-modal-content" style={{ maxWidth: 720 }}>
        <div className="emergency-modal-head">
          <div>
            <h2 id="historyModalTitle" style={{ color: 'var(--md-primary, #6750a4)' }}>
              {patient.name} ({patient.uhid})
            </h2>
            <p id="historyModalSubtitle">
              {(patient.age || 'Unknown Age')} {'•'} {patient.gender || '—'} {'•'} Registered on {formatDate(patient.created_at)}
            </p>
          </div>
          <button className="emergency-modal-close" type="button" onClick={onClose} aria-label="Close modal">{'✕'}</button>
        </div>

        <div style={{ background: 'var(--md-surface-container-low, #f8fafc)', border: '1px solid var(--md-outline-variant, #e2e8f0)', padding: '16px 20px', borderRadius: 12, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, fontSize: 13 }}>
          {headerCell('UHID', patient.uhid || '--', 'var(--md-primary, #6750a4)')}
          {headerCell('Age / Gender', (patient.age || '—') + ' / ' + (patient.gender || '—'))}
          {headerCell('Blood Group', patient.blood_group || 'Not Recorded')}
          {headerCell('Phone', patient.phone || '—')}
          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-muted-fg)', textTransform: 'uppercase' }}>Insurance</span>
            <strong id="modalInsurance">
              {patient.insurance ? (
                <span style={{ color: '#047857', fontWeight: 700 }}>
                  {patient.insurance.provider_name} ({'₹'}{(patient.insurance.coverage_limit || 0).toLocaleString('en-IN')})
                </span>
              ) : (
                <span style={{ color: 'var(--color-muted-fg)' }}>Self Pay</span>
              )}
            </strong>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px', color: 'var(--color-fg)' }}>
            Outpatient Encounters &amp; Appointments
          </h3>
          <div id="modalAppointmentsContainer" style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--md-outline-variant, #e2e8f0)', borderRadius: 8 }}>
            {encounters.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-muted-fg)', fontSize: 12 }}>
                No recorded outpatient appointments.
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 12, margin: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--md-surface-container-high, #f8fafc)' }}>
                    <th>Date &amp; Time</th><th>Department</th><th>Doctor</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {encounters.map((enc, i) => {
                    const doc = enc.doctor_id ? doctorsById[enc.doctor_id] : null;
                    return (
                      <tr key={i}>
                        <td>
                          {formatDate(enc.scheduled_datetime || enc.requested_date || enc.created_at)}{' '}
                          <small>({to12Hour(enc.scheduled_datetime ? enc.scheduled_datetime.slice(11, 16) : enc.requested_time) || ''})</small>
                        </td>
                        <td>{enc.department || (doc ? doc.specialization : 'General')}</td>
                        <td>{doc ? doc.name : 'Attending Specialist'}</td>
                        <td>
                          <Badge variant={enc.status === 'CONSULTATION_DONE' || enc.status === 'COMPLETED' ? 'success' : enc.status === 'REJECTED' || enc.status === 'CANCELLED' ? 'error' : 'neutral'}>
                            {enc.status === 'CONSULTATION_DONE' && enc.visit_type === 'Follow-Up' ? 'Follow Up' : statusLabel(enc.status)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px', color: 'var(--color-fg)' }}>
            Inpatient Admissions &amp; Bed Allocations
          </h3>
          <div id="modalAdmissionsContainer" style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--md-outline-variant, #e2e8f0)', borderRadius: 8 }}>
            {!patient.admissions || patient.admissions.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-muted-fg)', fontSize: 12 }}>
                No recorded inpatient admissions.
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 12, margin: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--md-surface-container-high, #f8fafc)' }}>
                    <th>Admission Date</th><th>Bed Number</th><th>Admission Type</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.admissions.map((adm) => {
                    const bed = bedsById[adm.bed_id];
                    const active = adm.status === 'ACTIVE' || adm.status === 'ADMITTED';
                    return (
                      <tr key={adm.admission_id}>
                        <td>{formatDate(adm.admit_time || adm.created_at)}</td>
                        <td>{bed ? bed.bed_number + ' (' + (bed.ward_name || 'Ward') + ')' : 'Bed Assigned'}</td>
                        <td>{adm.visit_type || 'IPD'}</td>
                        <td><Badge variant={active ? 'success' : 'neutral'}>{adm.status}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="emergency-modal-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" className="suggest" type="button" style={{ borderRadius: 'var(--radius-full, 9999px)', padding: '8px 20px' }} onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  </Modal>
);
}

