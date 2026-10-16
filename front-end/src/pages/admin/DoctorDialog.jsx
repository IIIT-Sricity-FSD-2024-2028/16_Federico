'use strict';

import { useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import Button from '../../components/ui/Button.jsx';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';

const BLANK = { name: '', specialization: '', phone: '', email: '' };

export default function DoctorDialog({ open, doctor, onClose, onSaved }) {
  if (!open) return null;
  return (
    <DoctorForm key={doctor ? doctor.doctor_id : 'new'} doctor={doctor} onClose={onClose} onSaved={onSaved} />
  );
}

function DoctorForm({ doctor, onClose, onSaved }) {
  const [f, setF] = useState(() =>
    doctor
      ? {
          name: doctor.name || '',
          specialization: doctor.specialization || '',
          phone: doctor.phone || '',
          email: doctor.email || '',
        }
      : BLANK,
  );
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: f.name.trim(),
      specialization: f.specialization.trim() || 'General Practitioner',
      phone: f.phone.trim() || undefined,
      email: f.email.trim() || undefined,
    };
    if (!payload.name) return;
    try {
      if (doctor) {
        await api.doctors.update(doctor.doctor_id, payload);
        toast(payload.name + ' updated.', 'success');
      } else {
        await api.doctors.create(payload);
        toast(payload.name + ' added.', 'success');
      }
      onClose();
      await onSaved();
    } catch (err) {
      toast(err.message || 'Could not save this doctor.', 'error');
    }
  }

  return (
    <DialogShell
      open
      onClose={onClose}
      title={doctor ? 'Edit ' + doctor.name : 'Add a Doctor'}
      subtitle="Configure medical doctor profile, clinical specialization, and contact details."
    >
      <form id="doctor-form" className="dialog-form" onSubmit={handleSubmit}>
        <div className="md-field">
          <label htmlFor="doctor-name">Doctor Name</label>
          <input id="doctor-name" required placeholder="Dr. …" value={f.name} onChange={set('name')} />
        </div>
        <div className="md-field">
          <label htmlFor="doctor-spec">Medical Specialization</label>
          <input id="doctor-spec" required placeholder="e.g. Cardiology, Neurology, Pediatrics" value={f.specialization} onChange={set('specialization')} />
        </div>
        <div className="md-field">
          <label htmlFor="doctor-phone">Phone Number</label>
          <input id="doctor-phone" placeholder="e.g. 9876543210" value={f.phone} onChange={set('phone')} />
        </div>
        <div className="md-field">
          <label htmlFor="doctor-email">Email Address</label>
          <input id="doctor-email" type="email" placeholder="e.g. doctor@hospital.com" value={f.email} onChange={set('email')} />
        </div>
        <div className="md-dialog-actions">
          <Button variant="outline" type="button" id="doctor-cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
