'use strict';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useSession } from '../../auth/useSession.js';
import { useSearchParam } from '../../hooks/useSearchParam.js';
import { toast } from '../../components/feedback/feedback.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import signupPageCss from '../../styles/signup/signup-page.css?inline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { isReservedStaffEmail } from '../../lib/emailIdentity.js';

/**
 * Ported from signup/signup-page.html + signup-page.js.
 *
 * Validation order is load-bearing - the user sees whichever message fires
 * first - so the nine checks run in exactly the original sequence with their
 * original wording. The one addition (unified login) sits right after the
 * email-format check: staff-shaped addresses on a hospital domain are refused. showToast's 'warn' -> 'warning' mapping is kept too; note
 * that org-signup.js does NOT do this mapping (defect D9).
 */
const showToast = (message, type = 'info') => toast(message, type === 'warn' ? 'warning' : type);

function normalizeToIsoDate(str) {
  if (!str) return '';
  const trimmed = String(str).trim();
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return trimmed;
}

export default function SignupPage() {
  usePageStyles(signupPageCss);
  useDocumentTitle('Federico Signup');
  const navigate = useNavigate();
  const { signupPatient } = useSession();
  const preselectOrg = useSearchParam('org');

  const [organizations, setOrganizations] = useState(null);
  const [orgLoadFailed, setOrgLoadFailed] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  const [f, setF] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    email: '',
    phone: '',
    bloodGroup: '',
    password: '',
    confirmPassword: '',
    provider: '',
    coverage: '',
    policyNumber: '',
    memberId: '',
    validFrom: '',
    validTo: '',
    terms: false,
  });
  const set = (k) => (e) =>
    setF((prev) => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const orgs = await api.marketplace.organizations();
        if (cancelled) return;
        setOrganizations(orgs || []);
        if (preselectOrg && (orgs || []).some((o) => String(o.organization_id) === preselectOrg)) {
          setOrgId(preselectOrg);
        } else if ((orgs || []).length) {
          setOrgId(String(orgs[0].organization_id));
        }
      } catch {
        if (cancelled) return;
        setOrgLoadFailed(true);
        setOrganizations([]);
        toast('Could not load the list of hospitals. Please refresh.', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preselectOrg]);

  async function handleCreate() {
    const firstName = f.firstName.trim();
    const lastName = f.lastName.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const email = f.email.trim().toLowerCase();
    const phone = f.phone.trim();
    const organizationId = orgId ? Number(orgId) : null;

    if (!firstName || !lastName || !f.dob || !f.gender || !email || !phone || !f.password || !organizationId) {
      showToast(
        !organizationId
          ? 'Please choose a hospital to register with.'
          : 'Please fill in all required fields.',
        'warn',
      );
      return;
    }

    const dobDate = new Date(f.dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(dobDate.getTime())) return showToast('Please enter a valid date of birth.', 'warn');
    if (dobDate > today) return showToast('Date of Birth cannot be in the future.', 'warn');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email address.', 'warn');
    // name.hom@<hospital domain> and the like open a staff portal on the
    // unified login page, so patients can't register them.
    if (isReservedStaffEmail(email, organizations)) {
      return showToast(
        'This address format is reserved for hospital staff. Please use your personal email.',
        'warn',
      );
    }
    if (!/^\+?[0-9\s-]{8,15}$/.test(phone)) return showToast('Please enter a valid phone number.', 'warn');
    if (f.password.length < 6) return showToast('Password must be at least 6 characters long.', 'warn');
    if (f.password !== f.confirmPassword) return showToast('Passwords do not match. Please try again.', 'warn');
    if (!f.terms) {
      return showToast(
        'You must agree to the Terms of Service and Privacy Policy to register.',
        'warn',
      );
    }

    setSubmitting(true);
    try {
      const result = await signupPatient({
        name: fullName,
        email,
        password: f.password,
        phone,
        dob: f.dob,
        gender: f.gender,
        blood_group: f.bloodGroup || undefined,
        organization_id: organizationId,
      });

      // Optional insurance, only when every field is filled - and a failure
      // here is logged, never surfaced, because the account already exists.
      if (f.provider && f.policyNumber && f.memberId && f.validFrom && f.validTo) {
        try {
          await api.patients.createInsurance({
            patient_id: result.patient.patient_id,
            provider_name: f.provider,
            policy_number: f.policyNumber,
            member_id: f.memberId,
            coverage_type: f.coverage || 'Individual',
            valid_from: normalizeToIsoDate(f.validFrom),
            valid_to: normalizeToIsoDate(f.validTo),
          });
        } catch (insuranceErr) {
          console.warn('[Signup] Insurance could not be saved, continuing:', insuranceErr);
        }
      }

      setCreated(true);
      showToast('Account created. Your UHID is ' + result.patient.uhid + '.', 'success');
      setTimeout(() => navigate('/Patient/patient-dashboard.html'), 1400);
    } catch (err) {
      setSubmitting(false);
      showToast(
        err?.status === 409
          ? 'An account with this email already exists.'
          : err?.message || 'Could not create your account. Please try again.',
        'warn',
      );
    }
  }

  return (
    <>
      <header className="topbar">
        <Link to="/landing/landing-page.html" className="brand" title="Back to Home">
          <div className="brand-icon">F</div>
          <div className="brand-name">Federico Cloud</div>
        </Link>
        <button
          className="login-shortcut"
          type="button"
          onClick={() => navigate('/login/login-page.html')}
        >
          Already have an account? Login
        </button>
      </header>

      <main className="signup-wrapper">
        <div className="md-blur-shape md-blur-secondary" style={{ width: 420, height: 420, top: -140, right: -160 }} aria-hidden="true" />
        <div className="md-blur-shape md-blur-primary" style={{ width: 320, height: 320, bottom: -80, left: -140 }} aria-hidden="true" />

        <section className="signup-card">
          <h1>Create your account</h1>
          <p className="subtext">Register as a patient to access appointments and health records</p>
          <div className="pill">Patient Registration</div>

          <form className="signup-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-section">
              <div className="section-title">Hospital</div>
              <div className="grid-one">
                <div className="form-group">
                  <label htmlFor="organization">Register with</label>
                  <select id="organization" value={orgId} onChange={(e) => setOrgId(e.target.value)} disabled={organizations === null}>
                    {organizations === null ? (
                      <option value="">Loading hospitals&hellip;</option>
                    ) : orgLoadFailed ? (
                      <option value="">Could not load hospitals {'—'} refresh to retry</option>
                    ) : (
                      organizations.map((org) => (
                        <option key={org.organization_id} value={String(org.organization_id)}>
                          {org.name}
                        </option>
                      ))
                    )}
                  </select>
                  <span className="field-hint">
                    Not sure which one? <Link to="/marketplace/marketplace-page.html">Browse hospitals</Link>.
                  </span>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">Personal Information</div>
              <div className="grid-two">
                <div className="form-group">
                  <label htmlFor="first-name">First Name</label>
                  <input id="first-name" type="text" placeholder="Enter first name" value={f.firstName} onChange={set('firstName')} />
                </div>
                <div className="form-group">
                  <label htmlFor="last-name">Last Name</label>
                  <input id="last-name" type="text" placeholder="Enter last name" value={f.lastName} onChange={set('lastName')} />
                </div>
              </div>
              <div className="grid-two">
                <div className="form-group">
                  <label htmlFor="dob">Date of Birth</label>
                  <input id="dob" type="date" value={f.dob} onChange={set('dob')} />
                </div>
                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
                  <select id="gender" value={f.gender} onChange={set('gender')}>
                    <option value="" disabled>Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">Contact Details</div>
              <div className="grid-one">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input id="email" type="email" placeholder="name@example.com" value={f.email} onChange={set('email')} />
                </div>
              </div>
              <div className="grid-two">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" type="text" placeholder="+91 XXXXX XXXXX" value={f.phone} onChange={set('phone')} />
                </div>
                <div className="form-group">
                  <label htmlFor="blood-group">Blood Group</label>
                  <select id="blood-group" value={f.bloodGroup} onChange={set('bloodGroup')}>
                    <option value="" disabled>Select blood group</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>O+</option>
                    <option>AB+</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">Security</div>
              <div className="grid-two">
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input id="password" type="password" placeholder="Create password" value={f.password} onChange={set('password')} />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input id="confirm-password" type="password" placeholder="Repeat your password" value={f.confirmPassword} onChange={set('confirmPassword')} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title with-badge">
                <span>Insurance Information</span>
                <span className="optional-badge">Optional</span>
              </div>
              <div className="grid-two">
                <div className="form-group">
                  <label htmlFor="provider">Insurance Provider</label>
                  <input id="provider" type="text" placeholder="e.g. Star Health, Care Health" value={f.provider} onChange={set('provider')} />
                </div>
                <div className="form-group">
                  <label htmlFor="coverage">Coverage Type</label>
                  <select id="coverage" value={f.coverage} onChange={set('coverage')}>
                    <option value="" disabled>Select coverage</option>
                    <option>Individual</option>
                    <option>Family</option>
                    <option>Corporate</option>
                  </select>
                </div>
              </div>
              <div className="grid-two">
                <div className="form-group">
                  <label htmlFor="policy-number">Policy Number</label>
                  <input id="policy-number" type="text" placeholder="e.g. POL-2026-XXXXXX" value={f.policyNumber} onChange={set('policyNumber')} />
                </div>
                <div className="form-group">
                  <label htmlFor="member-id">Member / Card ID</label>
                  <input id="member-id" type="text" placeholder="e.g. MEM-XXXXXXX" value={f.memberId} onChange={set('memberId')} />
                </div>
              </div>
              <div className="grid-two">
                <div className="form-group">
                  <label htmlFor="valid-from">Valid From</label>
                  <input id="valid-from" type="date" value={f.validFrom} onChange={set('validFrom')} />
                </div>
                <div className="form-group">
                  <label htmlFor="valid-to">Valid To (Expiry)</label>
                  <input id="valid-to" type="date" value={f.validTo} onChange={set('validTo')} />
                </div>
              </div>

              {/*
                The two upload boxes were decorative in the legacy page too: no
                file input, no handler, no upload. Kept as-is so the form looks
                the same; wiring them up would be new behaviour.
              */}
              <div className="grid-two uploads-grid">
                <div className="form-group">
                  <label>Upload Insurance Card</label>
                  <div className="mini-label">Card Image <span>Front</span></div>
                  <button className="upload-box" type="button">
                    <strong>Drop or browse</strong>
                    <small>Front side of card</small>
                  </button>
                </div>
                <div className="form-group">
                  <label>&nbsp;</label>
                  <div className="mini-label">Card Image <span>Back</span></div>
                  <button className="upload-box" type="button">
                    <strong>Drop or browse</strong>
                    <small>Front side of card</small>
                  </button>
                </div>
              </div>
            </div>

            <label className="terms-row">
              <input type="checkbox" checked={f.terms} onChange={set('terms')} />
              <span>
                I agree to the <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a> and{' '}
                <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              </span>
            </label>

            <button
              className="create-btn"
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              style={created ? { opacity: 0.8 } : undefined}
            >
              {created ? 'Account Created' : submitting ? 'Creating account…' : 'Create Account'}
            </button>

            <div className="bottom-login">
              <span>Already registered?</span>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}

