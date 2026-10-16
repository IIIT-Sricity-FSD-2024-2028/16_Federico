'use strict';

import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/layout/Modal.jsx';

/** Ported from #searchResultPopup in PRE/pages/APPointment.html. */
export default function SearchResultPopup({ patient, onClose }) {
  if (!patient) return null;

  return (
    <Modal open={Boolean(patient)} onClose={onClose} className="popup" labelledBy="searchFoundTitle">
      <div id="searchResultPopup" style={{ display: 'contents' }}>
        <div className="emergency-modal-content" style={{ maxWidth: 440 }}>
          <div className="emergency-modal-head">
            <div>
              <h2 id="searchFoundTitle" style={{ color: 'var(--md-primary, #0f766e)' }}>Patient Record Found</h2>
              <p>Verified profile linked to this contact number.</p>
            </div>
            <button className="emergency-modal-close" type="button" onClick={onClose} aria-label="Close modal">{'✕'}</button>
          </div>

          <div className="quick-patient-box" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--color-muted-fg)', fontSize: 12 }}>Patient UHID:</span>
              <strong id="searchResultPatientId" style={{ color: 'var(--md-primary, #0f766e)' }}>{patient.patientId || '-'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted-fg)', fontSize: 12 }}>Full Name:</span>
              <strong id="searchResultPatientName">{patient.name || '-'}</strong>
            </div>
          </div>

          <div className="emergency-modal-actions">
            <Button variant="primary" className="green" type="button" onClick={onClose}>Continue Booking</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
