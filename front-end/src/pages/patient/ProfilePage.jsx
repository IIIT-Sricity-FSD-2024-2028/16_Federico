'use strict';

import { useEffect, useRef, useState } from 'react';
import { usePatientStore } from './usePatientStore.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import EyeField from './EyeField.jsx';
import InsuranceCardUpload from './InsuranceCardUpload.jsx';
import {
  SECTION_FIELDS,
  READONLY_FIELDS,
  valuesFromProfile,
  parseCoverage,
  capitalize,
} from './profileFields.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import patientProfileCss from '../../styles/patient/patient-profile.css?inline';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/**
 * patient-profile.js populated every field with `input.value = ...`. For a
 * <select> that is load-bearing: assigning a value no <option> carries leaves
 * the control showing nothing (selectedIndex -1), which is what a patient whose
 * stored coverage_type is, say, "Full" actually sees. A React controlled select
 * would instead snap to the first option, so the assignment is reproduced on
 * the node rather than driven through the `value` prop.
 */
function NativeSelect({ id, value, onChange, disabled, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.value = value ?? '';
  }, [value]);
  return (
    <select id={id} ref={ref} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
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

  const [values, setValues] = useState({});
  const [snapshot, setSnapshot] = useState({});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [passwordHint, setPasswordHint] = useState({ text: '', variant: '' });

  // Insurance card scan URLs, seeded from the loaded profile so an existing
  // scan isn't dropped by an unrelated save, and updated in place as soon as a
  // new file finishes uploading. `undefined` means "not seeded yet", exactly as
  // the module-level uploadedCardUrls object used it.
  const [cardUrlState, setCardUrlState] = useState({ front: undefined, back: undefined });
  const [uploadingName, setUploadingName] = useState({ front: '', back: '' });

  /**
   * populateProfileForm(): re-seeds every field from the store. The legacy page
   * ran this on load and again on every `patientStoreUpdated`, so a background
   * refresh would overwrite an in-progress edit; that is preserved here.
   *
   * Done while rendering when the store hands over a new profile object
   * (React's "adjust state when a prop changes" pattern) rather than in an
   * effect, which rendered once with stale fields first.
   */
  const [seededFrom, setSeededFrom] = useState(null);
  if (profile && profile !== seededFrom) {
    setSeededFrom(profile);
    const next = valuesFromProfile(profile);
    setValues(next);
    setSnapshot(next);
    setCardUrlState((s) => ({
      front: s.front === undefined ? profile.insurance?.cardFrontUrl || null : s.front,
      back: s.back === undefined ? profile.insurance?.cardBackUrl || null : s.back,
    }));
  }

  function setValue(id, value) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  function valueOf(id) {
    return String(values[id] ?? '').trim();
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
      if (section === 'password') {
        const nextPassword = values['new-password'] || '';
        const confirmPassword = values['confirm-password'] || '';
        const currentPassword = values['current-password'] || '';
        if (!nextPassword || nextPassword !== confirmPassword) {
          setPasswordHint({ text: 'Passwords do not match.', variant: 'no-match' });
          return;
        }
        if (nextPassword.length < 6) {
          setPasswordHint({ text: 'Password must be at least 6 characters.', variant: 'no-match' });
          return;
        }
        try {
          await api.auth.changePassword(nextPassword, currentPassword);
          setPasswordHint({ text: 'Password updated successfully.', variant: 'match' });
          commitSnapshot('password');
          setEditing(null);
          toast('Password updated.', 'success');
        } catch (err) {
          setPasswordHint({ text: err?.message || 'Failed to update password.', variant: 'no-match' });
          toast(err?.message || 'Failed to update password.', 'warning');
        }
        return;
      }

      if (section === 'personal') {
        const fullName = [valueOf('first-name'), valueOf('last-name')].filter(Boolean).join(' ');
        await updateProfile({
          name: fullName,
          dob: valueOf('dob'),
          gender: valueOf('gender'),
          bloodGroup: valueOf('blood-group'),
        });
      }

      if (section === 'contact') {
        await updateProfile({
          phone: valueOf('phone'),
          altPhone: valueOf('alt-phone'),
          address: valueOf('address'),
        });
      }

      if (section === 'insurance') {
        await updateInsurance({
          provider: valueOf('ins-provider'),
          coverageType: valueOf('ins-coverage'),
          policyNumber: valueOf('policy-number'),
          memberId: valueOf('member-id'),
          validFrom: valueOf('valid-from'),
          validTo: valueOf('valid-to'),
          coverage: parseCoverage(valueOf('coverage-amount')),
          cardFrontUrl: cardUrlState.front ?? null,
          cardBackUrl: cardUrlState.back ?? null,
        });
      }

      // The store refresh re-seeds every field through the effect above, which
      // is what populateProfileForm() did at this point.
      commitSnapshot(section);
      setEditing(null);
      toast(capitalize(section) + ' details saved.', 'success');
    } catch (err) {
      toast(err?.message || 'Could not save changes.', 'warning');
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
              <option>Individual</option>
              <option>Family</option>
              <option>Corporate</option>
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
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
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
                      <option key={g}>{g}</option>
                    ))}
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
                  <EyeFieldInner
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
              <strong>{profile ? profile.name || '' : 'Loading...'}</strong>
              <span>UHID: {profile ? profile.uhid || '' : '--'}</span>
              <span className="patient-tag">Patient</span>
            </div>

            <hr />

            {/* The legacy page wrote these six values by index into
                `.side-info .side-row strong`; they are explicit here. */}
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

/**
 * The current-password field has the same eye button but sits in a full-width
 * .form-group rather than the two-column grid, so it reuses only the input.
 */
function EyeFieldInner({ id, placeholder, disabled, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="eye-btn"
        type="button"
        aria-label="Toggle password visibility"
        data-target={id}
        onClick={() => setVisible((v) => !v)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </>
  );
}
