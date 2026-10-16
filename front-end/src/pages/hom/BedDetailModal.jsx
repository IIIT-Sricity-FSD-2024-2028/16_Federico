'use strict';

import DialogShell from '../../components/layout/DialogShell.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { formatDateTime } from './homHelpers.js';

/**
 * Ported from #modal-bed-detail plus openDetailModal in HOM/beds.js.
 *
 * The legacy version reconfigured six elements imperatively - text, display and
 * even .onclick - per bed status. The three states are conditional JSX here,
 * with every label preserved.
 */
export default function BedDetailModal({
  bedId, data, patientForBed, onClose, onToggleMaintenance, onAssign, onViewInPatientFlow,
}) {
  if (bedId === null) return null;

  const bed = (data.beds || []).find((b) => b.bed_id === bedId);
  if (!bed) return null;

  const ward = (data.wards || []).find((w) => w.ward_id === bed.ward_id);
  const linked = patientForBed(bedId);
  const doctorsById = {};
  (data.doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));

  const isOccupied = bed.status === 'OCCUPIED' && linked;
  const isAvailable = bed.status === 'AVAILABLE';

  const compatibleRequests = (data.bedRequests || []).filter(
    (r) => r.status === 'PENDING' && (!r.ward_id || r.ward_id === bed.ward_id),
  );

  let badge;
  let since;
  if (isOccupied) {
    badge = <Badge variant="error">OCCUPIED</Badge>;
    since = 'Admitted: ' + formatDateTime(linked.request.decided_at || linked.request.created_at);
  } else if (isAvailable) {
    badge = <Badge variant="success">AVAILABLE {'·'} Not Occupied</Badge>;
    since = 'Status: Vacant & Clean';
  } else {
    badge = <Badge variant="neutral">UNDER MAINTENANCE</Badge>;
    since = 'Status: Maintenance';
  }

  const doctor = isOccupied && linked.request.doctor_id ? doctorsById[linked.request.doctor_id] : null;

  return (
    <DialogShell
      open
      onClose={onClose}
      title={`Bed Details — ${bed.bed_number}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
          {!isOccupied ? (
            <button className="btn btn-secondary btn-default" id="detail-status-btn" onClick={() => onToggleMaintenance(bed.bed_id)}>
              {bed.status === 'MAINTENANCE' ? 'Mark as Available' : 'Mark as Under Maintenance'}
            </button>
          ) : null}
          <button className="btn btn-secondary btn-default" onClick={onClose}>Close</button>
          {isOccupied ? (
            <button className="btn btn-primary btn-default" id="detail-action-btn" onClick={() => onViewInPatientFlow && onViewInPatientFlow(linked?.patient?.uhid)}>
              View in Patient Flow
            </button>
          ) : isAvailable && compatibleRequests.length > 0 ? (
            <button className="btn btn-primary btn-default" id="detail-action-btn" onClick={() => onAssign(bed.bed_id)}>
              Assign Patient ({compatibleRequests.length} Waiting)
            </button>
          ) : null}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <span id="detail-badge">{badge}</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }} id="detail-since">{since}</span>
        </div>

        {isOccupied ? (
          <div id="detail-patient-section" style={{ background: 'var(--neutral-bg)', padding: 16, borderRadius: 'var(--radius-base)' }}>
            <h3 className="h3" style={{ fontSize: 14, marginBottom: 12 }}>Current Inpatient Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><div className="label">Patient Name</div><div style={{ fontWeight: 600, fontSize: 14 }}>{linked.patient.name || '-'}</div></div>
              <div><div className="label">UHID</div><div style={{ fontWeight: 600, fontSize: 14 }}>{linked.patient.uhid || '-'}</div></div>
              <div><div className="label">Department</div><div style={{ fontWeight: 500, fontSize: 14 }}>{linked.request.department || 'General'}</div></div>
              <div>
                <div className="label">Attending Physician</div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {doctor ? (doctor.name.startsWith('Dr.') ? doctor.name : 'Dr. ' + doctor.name) : linked.request.doctor_id ? 'Doctor #' + linked.request.doctor_id : 'Staff Physician'}
                </div>
              </div>
            </div>
          </div>
        ) : isAvailable ? (
          <div id="detail-vacant-section" style={{ background: 'var(--status-success-bg, #e3f3e4)', padding: 16, borderRadius: 'var(--radius-base)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
            <h3 className="h3" style={{ fontSize: 14, marginBottom: 6, color: 'var(--status-success-fg, #1b5e20)' }}>Bed Vacant &amp; Available</h3>
            <p style={{ fontSize: 13, color: 'var(--status-success-fg, #1b5e20)', margin: 0 }}>
              This bed is clean, sanitized, and ready for patient allocation.
            </p>
          </div>
        ) : (
          <div id="detail-vacant-section">
            <h3 className="h3" style={{ fontSize: 14, marginBottom: 6, color: 'var(--text-secondary)' }}>Bed Under Maintenance</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              This bed is temporarily offline for maintenance or sanitation.
            </p>
          </div>
        )}

        <div>
          <h3 className="h3" style={{ fontSize: 14, marginBottom: 12 }}>Ward Location</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><div className="label">Ward</div><div style={{ fontWeight: 500 }} id="detail-ward">{ward ? ward.ward_name : '-'}</div></div>
            <div><div className="label">Bed Number</div><div style={{ fontWeight: 500 }} id="detail-number">{bed.bed_number || '-'}</div></div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
