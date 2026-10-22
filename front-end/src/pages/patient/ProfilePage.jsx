'use strict';

import { useEffect, useRef, useState } from 'react';
import { usePatientStore } from './usePatientStore.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import { normalizePhone } from '../../lib/phone.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import EyeField from './EyeField.jsx';
import InsuranceCardUpload from './InsuranceCardUpload.jsx';
import {
  SECTION_FIELDS,
  READONLY_FIELDS,
  valuesFromProfile,
  capitalize,
  validatePersonal,
  validateContact,
  validatePassword,
  validateInsurance,
} from './profileFields.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import patientProfileCss from '../../styles/patient/patient-profile.css?inline';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/**
 * NativeSelect ensures custom or non-standard stored values do not
 * prematurely snap to the first <option>.
 */
function NativeSelect({ id, value, onChange, disabled, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.value = value ?? '';
  }, [value]);
  return (
    <select id={id} ref={ref} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  );
}

/** A panel's heading row plus its Edit / Change button. */
function SectionHead({ section, title, desc, editLabel, editing, onEdit }) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        <p className="panel-desc">{desc}</p>
      </div>
      <button
        className="edit-btn"
        type="button"
        data-section={section}
        disabled={editing === section}
        onClick={() => onEdit(section)}
      >
        {editing === section ? 'Editing...' : editLabel}
      </button>
    </div>
  );
}

/** A panel's Cancel / Save pair, hidden unless that section is being edited. */
function SectionActions({ section, saveLabel, editing, saving, onCancel, onSave }) {
  return (
    <div className={'form-actions' + (editing === section ? '' : ' hidden')} id={'actions-' + section}>
      <button className="cancel-btn" type="button" data-section={section} onClick={() => onCancel(section)}>
        Cancel
      </button>
      <button
        className="save-btn"
        type="button"
        data-section={section}
        disabled={saving}
        onClick={() => onSave(section)}
      >
        {saveLabel}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  usePageStyles(patientProfileCss);
  useDocumentTitle('Patient Profile');
  const { profile, updateProfile, updateInsurance } = usePatientStore();

  const [values, setValues] = useState(() => valuesFromProfile(profile));
  const [snapshot, setSnapshot] = useState(() => valuesFromProfile(profile));
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [passwordHint, setPasswordHint] = useState({ text: '', variant: '' });

  // Insurance card scan URLs, seeded from profile and updated when new file uploads.
  const [cardUrlState, setCardUrlState] = useState(() => ({
    front: profile?.insurance?.cardFrontUrl || null,
    back: profile?.insurance?.cardBackUrl || null,
  }));
  const [uploadingName, setUploadingName] = useState({ front: '', back: '' });

  // Synchronize values, snapshot, and card URLs whenever profile reference changes.
  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    const next = valuesFromProfile(profile);
    setSnapshot(next);
    setValues((current) => {
      if (editing) {
        const activeFields = SECTION_FIELDS[editing] || [];
        const merged = { ...next };
        activeFields.forEach((id) => {
          if (current[id] !== undefined) merged[id] = current[id];
        });
        return merged;
      }
      return next;
    });
    if (editing !== 'insurance') {
      setCardUrlState({
        front: profile?.insurance?.cardFrontUrl || null,
        back: profile?.insurance?.cardBackUrl || null,
      });
    }
  }

  function setValue(id, value) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  function fieldDisabled(section, id) {
    if (READONLY_FIELDS.includes(id)) return true;
    return editing !== section;
  }

  function onEdit(section) {
    setEditing(section);
  }

  function onCancel(section) {
    setValues((v) => {
      const restored = { ...v };
      SECTION_FIELDS[section].forEach((id) => {
        restored[id] = snapshot[id] ?? '';
      });
      return restored;
    });
    setPasswordHint({ text: '', variant: '' });
    if (section === 'insurance') {
      const persisted = profile?.insurance || {};
      setCardUrlState({ front: persisted.cardFrontUrl || null, back: persisted.cardBackUrl || null });
    }
    setEditing(null);
  }

  function commitSnapshot(section) {
    setSnapshot((s) => {
      const next = { ...s };
      SECTION_FIELDS[section].forEach((id) => {
        next[id] = values[id] ?? '';
      });
      return next;
    });
  }

  async function onSave(section) {
    setSaving(true);
    try {
      if (section === 'personal') {
        const res = validatePersonal(values);
        if (!res.valid) {
          toast(res.error, 'warning');
          return;
        }
        await updateProfile(res.payload);
      } else if (section === 'contact') {
        const res = validateContact(values, normalizePhone);
        if (!res.valid) {
          toast(res.error, 'warning');
          return;
        }
        await updateProfile(res.payload);
      } else if (section === 'password') {
        const res = validatePassword(values);
        if (!res.valid) {
          setPasswordHint({ text: res.error, variant: 'no-match' });
          toast(res.error, 'warning');
          return;
        }
        try {
          await api.auth.changePassword(values['new-password'], values['current-password']);
          setPasswordHint({ text: 'Password updated successfully.', variant: 'match' });
          commitSnapshot('password');
          setEditing(null);
          toast('Password updated.', 'success');
        } catch (err) {
          setPasswordHint({ text: err?.message || 'Failed to update password.', variant: 'no-match' });
          toast(err?.message || 'Failed to update password.', 'warning');
        }
        return;
      } else if (section === 'insurance') {
        const res = validateInsurance(values);
        if (!res.valid) {
          toast(res.error, 'warning');
          return;
        }
        await updateInsurance({
          ...res.payload,
          cardFrontUrl: cardUrlState.front ?? null,
          cardBackUrl: cardUrlState.back ?? null,
        });
      }

      commitSnapshot(section);
      setEditing(null);
      toast(capitalize(section) + ' details saved.', 'success');
    } catch (err) {
      if (err?.status === 401 || (err?.status === 403 && err?.message === 'Forbidden resource')) {
        toast('Your session has expired. Please sign out and sign back in.', 'warning');
      } else {
        toast(err?.message || 'Could not save changes.', 'warning');
      }
    } finally {
      setSaving(false);
    }
  }

  function onPasswordInput(id, value) {
    setValue(id, value);
    const next = { ...values, [id]: value };
    const a = next['new-password'] || '';
    const b = next['confirm-password'] || '';
    if (!a && !b) {
      setPasswordHint({ text: '', variant: '' });
    } else if (a === b) {
      setPasswordHint({ text: 'Passwords match.', variant: 'match' });
    } else {
      setPasswordHint({ text: 'Passwords do not match.', variant: 'no-match' });
    }
  }

  function openInsuranceCard(fileUrl) {
    const parts = fileUrl.split('/');
    const filename = parts.pop();
    const category = parts.pop();
    api.uploads.open(category, filename).catch((err) => {
      toast(err.message || 'Could not open file.', 'error');
    });
  }

  async function onCardChosen(side, file) {
    const previousUrl = cardUrlState[side];
    setUploadingName((u) => ({ ...u, [side]: file.name }));

    try {
      const result = await api.uploads.document(file);
      setCardUrlState((s) => ({ ...s, [side]: result.url }));
      toast(
        (side === 'front' ? 'Front' : 'Back') +
          ' card image uploaded. Click "Save Changes" to attach it.',
        'success',
      );
    } catch (err) {
      setCardUrlState((s) => ({ ...s, [side]: previousUrl }));
      toast(err.message || 'Could not upload file.', 'error');
    } finally {
      setUploadingName((u) => ({ ...u, [side]: '' }));
    }
  }

  const ins = profile?.insurance || {};

  const insuranceSection = (
    <section className="panel" id="section-insurance">
      <SectionHead
        editing={editing}
        onEdit={onEdit}
        section="insurance"
        title="Insurance Information"
        desc="Manage your insurance provider, policy details, and card documents."
        editLabel="Edit"
      />

      <form className="panel-form" id="form-insurance" onSubmit={(e) => e.preventDefault()}>
        <div className="form-grid-two">
          <div className="form-group">
            <label htmlFor="ins-provider">Insurance Provider</label>
            <input
              id="ins-provider"
              type="text"
              placeholder="e.g. Star Health"
              disabled={fieldDisabled('insurance', 'ins-provider')}
              value={values['ins-provider'] ?? ''}
              onChange={(e) => setValue('ins-provider', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ins-coverage">Coverage Type</label>
            <NativeSelect
              id="ins-coverage"
              disabled={fieldDisabled('insurance', 'ins-coverage')}
              value={values['ins-coverage']}
              onChange={(v) => setValue('ins-coverage', v)}
            >
              <option value="" disabled>
                Select coverage
              </option>
              <option value="Comprehensive">Comprehensive</option>
              <option value="Full">Full</option>
              <option value="Partial">Partial</option>
              <option value="Individual">Individual</option>
              <option value="Family">Family</option>
              <option value="Corporate">Corporate</option>
              <option value="Self">Self</option>
              {values['ins-coverage'] &&
                !['Comprehensive', 'Full', 'Partial', 'Individual', 'Family', 'Corporate', 'Self', ''].includes(
                  values['ins-coverage'],
                ) && <option value={values['ins-coverage']}>{values['ins-coverage']}</option>}
            </NativeSelect>
          </div>
        </div>
        <div className="form-grid-two">
          <div className="form-group">
            <label htmlFor="policy-number">Policy Number</label>
            <input
              id="policy-number"
              type="text"
              placeholder="POL-..."
              disabled={fieldDisabled('insurance', 'policy-number')}
              value={values['policy-number'] ?? ''}
              onChange={(e) => setValue('policy-number', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="member-id">Member / Card ID</label>
            <input
              id="member-id"
              type="text"
              placeholder="MEM-..."
              disabled={fieldDisabled('insurance', 'member-id')}
              value={values['member-id'] ?? ''}
              onChange={(e) => setValue('member-id', e.target.value)}
            />
          </div>
        </div>
        <div className="form-grid-two">
          <div className="form-group">
            <label htmlFor="valid-from">Valid From</label>
            <input
              id="valid-from"
              type="date"
              disabled={fieldDisabled('insurance', 'valid-from')}
              value={values['valid-from'] ?? ''}
              onChange={(e) => setValue('valid-from', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="valid-to">Valid To (Expiry)</label>
            <input
              id="valid-to"
              type="date"
              disabled={fieldDisabled('insurance', 'valid-to')}
              value={values['valid-to'] ?? ''}
              onChange={(e) => setValue('valid-to', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group full">
          <label htmlFor="coverage-amount">Coverage Amount (₹)</label>
          <input
            id="coverage-amount"
            type="text"
            placeholder="0"
            disabled={fieldDisabled('insurance', 'coverage-amount')}
            value={values['coverage-amount'] ?? ''}
            onChange={(e) => setValue('coverage-amount', e.target.value)}
          />
        </div>

        <div className="upload-section" id="upload-section">
          <p className="upload-title">Insurance Card Documents</p>
          <div className="upload-grid">
            <InsuranceCardUpload
              side="front"
              badgeClass="badge-front"
              badgeLabel="Front"
              caption="Front side of card"
              inputId="upload-front"
              labelId="upload-front-label"
              nameId="front-name"
              disabled={editing !== 'insurance'}
              fileUrl={cardUrlState.front}
              uploadingName={uploadingName.front}
              onFileChosen={onCardChosen}
              onViewFile={() => cardUrlState.front && openInsuranceCard(cardUrlState.front)}
            />
            <InsuranceCardUpload
              side="back"
              badgeClass="badge-back"
              badgeLabel="Back"
              caption="Back side of card"
              inputId="upload-back"
              labelId="upload-back-label"
              nameId="back-name"
              disabled={editing !== 'insurance'}
              fileUrl={cardUrlState.back}
              uploadingName={uploadingName.back}
              onFileChosen={onCardChosen}
              onViewFile={() => cardUrlState.back && openInsuranceCard(cardUrlState.back)}
            />
          </div>
        </div>

        <SectionActions editing={editing} saving={saving} onCancel={onCancel} onSave={onSave} section="insurance" saveLabel="Save Changes" />
      </form>
    </section>
  );

  return (
    <main className="profile-page">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information, security, and insurance details."
      />

      <div className="profile-layout">
        <div className="profile-main">
          <section className="panel" id="section-personal">
            <SectionHead
              editing={editing}
              onEdit={onEdit}
              section="personal"
              title="Personal Information"
              desc="Update your name, date of birth, and gender."
              editLabel="Edit"
            />

            <form className="panel-form" id="form-personal" onSubmit={(e) => e.preventDefault()}>
              <div className="form-grid-two">
                <div className="form-group">
                  <label htmlFor="first-name">First Name</label>
                  <input
                    id="first-name"
                    type="text"
                    placeholder="First Name"
                    disabled={fieldDisabled('personal', 'first-name')}
                    value={values['first-name'] ?? ''}
                    onChange={(e) => setValue('first-name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="last-name">Last Name</label>
                  <input
                    id="last-name"
                    type="text"
                    placeholder="Last Name"
                    disabled={fieldDisabled('personal', 'last-name')}
                    value={values['last-name'] ?? ''}
                    onChange={(e) => setValue('last-name', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-grid-two">
                <div className="form-group">
                  <label htmlFor="dob">Date of Birth</label>
                  <input
                    id="dob"
                    type="date"
                    disabled={fieldDisabled('personal', 'dob')}
                    value={values.dob ?? ''}
                    onChange={(e) => setValue('dob', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
                  <NativeSelect
                    id="gender"
                    disabled={fieldDisabled('personal', 'gender')}
                    value={values.gender}
                    onChange={(v) => setValue('gender', v)}
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    {values.gender && !['Male', 'Female', 'Other', ''].includes(values.gender) && (
                      <option value={values.gender}>{values.gender}</option>
                    )}
                  </NativeSelect>
                </div>
              </div>
              <div className="form-grid-two">
                <div className="form-group">
                  <label htmlFor="blood-group">Blood Group</label>
                  <NativeSelect
                    id="blood-group"
                    disabled={fieldDisabled('personal', 'blood-group')}
                    value={values['blood-group']}
                    onChange={(v) => setValue('blood-group', v)}
                  >
                    <option value="" disabled>
                      Select group
                    </option>
                    {BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    {values['blood-group'] && !BLOOD_GROUPS.includes(values['blood-group']) && (
                      <option value={values['blood-group']}>{values['blood-group']}</option>
                    )}
                  </NativeSelect>
                </div>
                <div className="form-group">
                  <label htmlFor="uhid">UHID</label>
                  <input id="uhid" type="text" placeholder="UHID" disabled readOnly value={values.uhid ?? ''} />
                </div>
              </div>
              <SectionActions editing={editing} saving={saving} onCancel={onCancel} onSave={onSave} section="personal" saveLabel="Save Changes" />
            </form>
          </section>

          <section className="panel" id="section-contact">
            <SectionHead
              editing={editing}
              onEdit={onEdit}
              section="contact"
              title="Contact Details"
              desc="Update your email address and phone number."
              editLabel="Edit"
            />

            <form className="panel-form" id="form-contact" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group full">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="email@domain.com"
                  disabled={fieldDisabled('contact', 'email')}
                  value={values.email ?? ''}
                  onChange={(e) => setValue('email', e.target.value)}
                />
              </div>
              <div className="form-grid-two">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="text"
                    placeholder="+91..."
                    disabled={fieldDisabled('contact', 'phone')}
                    value={values.phone ?? ''}
                    onChange={(e) => setValue('phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="alt-phone">Alternate Phone</label>
                  <input
                    id="alt-phone"
                    type="text"
                    placeholder="Optional"
                    disabled={fieldDisabled('contact', 'alt-phone')}
                    value={values['alt-phone'] ?? ''}
                    onChange={(e) => setValue('alt-phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group full">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  rows="2"
                  placeholder="Full address"
                  disabled={fieldDisabled('contact', 'address')}
                  value={values.address ?? ''}
                  onChange={(e) => setValue('address', e.target.value)}
                />
              </div>
              <SectionActions editing={editing} saving={saving} onCancel={onCancel} onSave={onSave} section="contact" saveLabel="Save Changes" />
            </form>
          </section>

          <section className="panel" id="section-password">
            <SectionHead
              editing={editing}
              onEdit={onEdit}
              section="password"
              title="Change Password"
              desc="Update your login password regularly for security."
              editLabel="Change"
            />

            <form className="panel-form" id="form-password" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group full">
                <label htmlFor="current-password">Current Password</label>
                <div className="input-eye">
                  <EyeField
                    bare
                    id="current-password"
                    placeholder="Enter current password"
                    disabled={fieldDisabled('password', 'current-password')}
                    value={values['current-password'] ?? ''}
                    onChange={(v) => setValue('current-password', v)}
                  />
                </div>
              </div>
              <div className="form-grid-two">
                <EyeField
                  id="new-password"
                  label="New Password"
                  placeholder="Enter new password"
                  disabled={fieldDisabled('password', 'new-password')}
                  value={values['new-password'] ?? ''}
                  onChange={(v) => onPasswordInput('new-password', v)}
                />
                <EyeField
                  id="confirm-password"
                  label="Confirm Password"
                  placeholder="Repeat new password"
                  disabled={fieldDisabled('password', 'confirm-password')}
                  value={values['confirm-password'] ?? ''}
                  onChange={(v) => onPasswordInput('confirm-password', v)}
                />
              </div>
              <p
                className={'hint-text' + (passwordHint.variant ? ' ' + passwordHint.variant : '')}
                id="password-match-hint"
              >
                {passwordHint.text}
              </p>
              <SectionActions editing={editing} saving={saving} onCancel={onCancel} onSave={onSave} section="password" saveLabel="Update Password" />
            </form>
          </section>

          {insuranceSection}
        </div>

        <aside className="profile-sidebar">
          <section className="panel side-card">
            <div className="avatar-block">
              <div className="big-avatar">{profile ? profile.initials || 'P' : '--'}</div>
              <strong>{profile ? profile.name || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || '' : 'Loading...'}</strong>
              <span>UHID: {profile ? profile.uhid || '' : '--'}</span>
              <span className="patient-tag">Patient</span>
            </div>

            <hr />

            <div className="side-info">
              <div className="side-row">
                <span>Age / Gender</span>
                <strong>{profile ? (profile.age || '') + ' yrs / ' + (profile.gender || '') : '--'}</strong>
              </div>
              <div className="side-row">
                <span>Blood Group</span>
                <strong>{profile ? profile.bloodGroup || '' : '--'}</strong>
              </div>
              <div className="side-row">
                <span>Contact</span>
                <strong>{profile ? profile.phone || '' : '--'}</strong>
              </div>
              <div className="side-row">
                <span>Insurance</span>
                <strong>
                  <span className="verified-badge">
                    {profile ? (ins.verified ? 'Verified' : 'Unverified') : '--'}
                  </span>
                </strong>
              </div>
              <div className="side-row">
                <span>Provider</span>
                <strong>{profile ? ins.provider || '' : '--'}</strong>
              </div>
              <div className="side-row">
                <span>Coverage</span>
                <strong>{profile ? '₹' + Number(ins.coverage || 0).toLocaleString('en-IN') : '--'}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
