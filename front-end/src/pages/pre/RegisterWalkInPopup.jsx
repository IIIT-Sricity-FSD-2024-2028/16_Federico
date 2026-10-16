'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/layout/Modal.jsx';
import { toast } from '../../components/feedback/feedback.js';

/**
 * Ported from #patientPopup plus registerPatient in PRE/js/Appointment.js.
 *
 * The name and age fields rewrite themselves as you type - anything outside
 * [A-Za-z .'-] or [0-9] is stripped and a toast fires. That is aggressive, but
 * it is what the original did, so it is preserved.
 */
const BLANK = { name: '', age: '', gender: '', phone: '', address: '' };

const isValidPhone = (p) => /^[0-9]{10}$/.test(String(p || '').trim());
const isValidAge = (a) => /^[1-9]\d*$/.test(String(a || '').trim());
const isValidName = (n) => /^[A-Za-z\s.'-]+$/.test(String(n || '').trim());
const sanitizeName = (v) => String(v || '').replace(/[^A-Za-z\s.'-]/g, '');
const sanitizeAge = (v) => String(v || '').replace(/[^0-9]/g, '');

export default function RegisterWalkInPopup({ open, onClose, onRegistered }) {
  const [f, setF] = useState(BLANK);
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setF(BLANK);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  if (!open) return null;

  function onNameChange(e) {
    const original = e.target.value;
    const sanitized = sanitizeName(original);
    if (original !== sanitized) {
      setF((p) => ({ ...p, name: sanitized }));
      toast('Name should contain letters only', 'error');
      return;
    }
    setF((p) => ({ ...p, name: original }));
    if (original.trim() && !isValidName(original)) toast('Name should contain letters only', 'error');
  }

  function onAgeChange(e) {
    const original = e.target.value;
    const sanitized = sanitizeAge(original);
    if (original !== sanitized) {
      setF((p) => ({ ...p, age: sanitized }));
      toast('Age must be a valid number', 'error');
      return;
    }
    setF((p) => ({ ...p, age: original }));
    if (original.trim() && !isValidAge(original)) toast('Enter age as a positive integer only', 'error');
  }

  async function submit() {
    const name = f.name.trim();
    const age = f.age.trim();
    const phone = f.phone.trim();
    const address = f.address.trim();

    if (!name || !age || !f.gender || !phone || !address) {
      toast('Please fill all required patient demographic fields', 'error');
      return;
    }
    if (!isValidName(name)) return toast('Name should contain letters only', 'error');
    if (!isValidAge(age)) return toast('Enter age as a positive integer only', 'error');
    if (!isValidPhone(phone)) return toast('Phone number must be exactly 10 digits', 'error');

    const birthYear = new Date().getFullYear() - Number(age);

    try {
      const patient = await api.patients.create({
        name,
        dob: birthYear + '-01-01',
        gender: f.gender,
        phone,
        address,
      });
      onClose();
      toast('Patient registered successfully with UHID ' + patient.uhid, 'success');
      await onRegistered(patient);
    } catch (err) {
      toast(err.message || 'Could not register patient', 'error');
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="popup" labelledBy="patientModalTitle">
      <div id="patientPopup" style={{ display: 'contents' }}>
        <div className="emergency-modal-content" style={{ maxWidth: 560 }}>
          <div className="emergency-modal-head">
            <div>
              <h2 id="patientModalTitle" style={{ color: 'var(--md-primary, #0f766e)' }}>Register Walk-In Patient</h2>
            </div>
            <button className="emergency-modal-close" type="button" onClick={onClose} aria-label="Close modal">{'✕'}</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="emergency-form-group" style={{ marginBottom: 0 }}>
              <label className="emergency-form-label" htmlFor="newName">Full Name *</label>
              <input type="text" id="newName" placeholder="e.g. Rahul Sharma" className="emergency-form-control" value={f.name} onChange={onNameChange} />
            </div>
            <div className="emergency-form-group" style={{ marginBottom: 0 }}>
              <label className="emergency-form-label" htmlFor="newAge">Age (Years) *</label>
              <input type="number" id="newAge" placeholder="e.g. 35" min="1" max="120" step="1" className="emergency-form-control" value={f.age} onChange={onAgeChange} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="emergency-form-group" style={{ marginBottom: 0 }}>
              <label className="emergency-form-label" htmlFor="newGender">Gender *</label>
              <select id="newGender" className="emergency-form-control" value={f.gender} onChange={(e) => setF((p) => ({ ...p, gender: e.target.value }))}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="emergency-form-group" style={{ marginBottom: 0 }}>
              <label className="emergency-form-label" htmlFor="newPhone">Phone Number *</label>
              <input type="tel" id="newPhone" placeholder="10-digit mobile" maxLength={10} className="emergency-form-control"
                value={f.phone} onChange={(e) => setF((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div className="emergency-form-group" style={{ marginBottom: 16 }}>
            <label className="emergency-form-label" htmlFor="newAddress">Residential Address *</label>
            <input type="text" id="newAddress" placeholder="e.g. 45 Green Park, New Delhi" className="emergency-form-control"
              value={f.address} onChange={(e) => setF((p) => ({ ...p, address: e.target.value }))} />
          </div>

          <div className="emergency-modal-actions">
            <Button variant="secondary" className="suggest" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" className="green" type="button" onClick={submit}>Register &amp; Select</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

