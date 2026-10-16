'use strict';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import orgSignupCss from '../../styles/signup/org-signup.css?inline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import TaggedEmailInput from '../../components/forms/TaggedEmailInput.jsx';
import {
  suggestEmailDomain,
  emailDomainProblem,
  normalizeDomain,
  buildTaggedEmail,
} from '../../lib/emailIdentity.js';

const TOTAL_STEPS = 4;
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const DEFAULT_BASE_FEE = 3000;
const DEFAULT_RATES = {
  GENERAL_BEDS: 150,
  ICU_BEDS: 600,
  PRIVATE_BEDS: 350,
  DOCTOR_SEATS: 150,
  STAFF_SEATS: 200,
  BILLING_TERMINALS: 500,
  WAREHOUSES: 1000,
  PATIENT_ADMISSIONS: 10,
};

/**
 * Ported from signup/org-signup.html + org-signup.js.
 *
 * DEFECT D3 is carried forward deliberately: the live rate card is read as
 * `res.base_fee`, but GET /platform/rates returns `base_platform_fee`. The
 * per-resource rates therefore update from the server while the base platform
 * fee stays pinned at 3000. Do not "fix" this here - constraint 1.
 *
 * DEFECT D9 likewise: every toast below passes 'warn', which UIFeedback does not
 * recognise and renders as 'info'. signup-page.js maps it to 'warning'; this
 * page never did.
 */
export default function OrgSignupPage() {
  usePageStyles(orgSignupCss);
  useDocumentTitle('Federico — Hospital Chain Onboarding & Provisioning');
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [baseFee, setBaseFee] = useState(DEFAULT_BASE_FEE);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [submitting, setSubmitting] = useState(false);
  const [provisioned, setProvisioned] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');

  const [org, setOrg] = useState({
    name: '',
    city: '',
    phone: '',
    address: '',
    specialties: '',
    emergency: true,
    emailDomain: '',
    domainEdited: false,
  });
  // `emailName` is the part before ".admin@<domain>" (unified login convention).
  const [admin, setAdmin] = useState({ name: '', emailName: '', password: '' });
  // Existing hospitals, only to flag a taken email domain early; the server decides.
  const [knownOrgs, setKnownOrgs] = useState([]);
  const [res, setRes] = useState({
    generalBeds: 30,
    icuBeds: 5,
    privateBeds: 10,
    doctorSeats: 10,
    staffSeats: 6,
    terminals: 2,
    warehouses: 1,
    admissions: 50,
  });

  const setResNum = (k) => (e) =>
    setRes((p) => ({ ...p, [k]: Math.max(0, parseInt(e.target.value, 10) || 0) }));

  useEffect(() => {
    api.marketplace
      .organizations()
      .then((orgs) => setKnownOrgs(orgs || []))
      .catch(() => {
        /* the server still rejects a taken domain */
      });
  }, []);

  // Follows the hospital name (City General Hospital → citygen.com) until edited.
  const emailDomain = org.domainEdited
    ? normalizeDomain(org.emailDomain)
    : org.name.trim()
      ? suggestEmailDomain(org.name, knownOrgs)
      : '';
  const domainProblem = emailDomain ? emailDomainProblem(emailDomain, knownOrgs) : null;
  const adminEmail = buildTaggedEmail(admin.emailName, 'admin', emailDomain);

  useEffect(() => {
    api.platform.rates
      .get()
      .then((data) => {
        if (data && data.rates) {
          const fee = data.base_platform_fee ?? data.base_fee;
          if (typeof fee === 'number') setBaseFee(fee);
          setRates((prev) => ({ ...prev, ...data.rates }));
        }
      })
      .catch(() => {
        /* rate card unavailable; the defaults above stand */
      });
  }, []);

  const costs = useMemo(() => {
    const genCost = res.generalBeds * rates.GENERAL_BEDS;
    const icuCost = res.icuBeds * rates.ICU_BEDS;
    const privCost = res.privateBeds * rates.PRIVATE_BEDS;
    const docCost = res.doctorSeats * rates.DOCTOR_SEATS;
    const staffCost = res.staffSeats * rates.STAFF_SEATS;
    const termCost = res.terminals * rates.BILLING_TERMINALS;
    const whCost = res.warehouses * rates.WAREHOUSES;
    const admCost = res.admissions * rates.PATIENT_ADMISSIONS;
    const resourceSubtotal =
      genCost + icuCost + privCost + docCost + staffCost + termCost + whCost + admCost;
    const subtotal = baseFee + resourceSubtotal;
    const gst = Math.round(subtotal * 0.18);
    return {
      genCost, icuCost, privCost, docCost, staffCost, termCost, whCost, admCost,
      baseFee, resourceSubtotal, subtotal, gst, total: subtotal + gst,
    };
  }, [res, rates, baseFee]);

  function next1() {
    if (!org.name.trim() || !org.city.trim() || !org.phone.trim()) {
      toast('Please fill in required hospital details (Name, City, Phone).', 'warn');
      return;
    }
    if (!emailDomain || domainProblem) {
      toast(domainProblem || 'Please choose a staff email domain.', 'warn');
      return;
    }
    goto(2);
  }

  function next3() {
    if (!admin.name.trim() || !adminEmail || !admin.password) {
      toast('Please complete all administrator account fields.', 'warn');
      return;
    }
    if (admin.password.length < 6) {
      toast('Password must be at least 6 characters.', 'warn');
      return;
    }
    goto(4);
  }

  function goto(n) {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    const specialties = org.specialties.trim()
      ? org.specialties.split(',').map((s) => s.trim()).filter(Boolean)
      : ['General Medicine'];

    const payload = {
      name: org.name.trim(),
      city: org.city.trim(),
      phone: org.phone.trim(),
      address: org.address.trim(),
      specialties,
      emergency_available: org.emergency,
      plan_id: org.plan_id ? Number(org.plan_id) : 1,
      module_resources: {
        ADMISSIONS: {
          GENERAL_BEDS: res.generalBeds,
          ICU_BEDS: res.icuBeds,
          PRIVATE_BEDS: res.privateBeds,
        },
        DOCTOR: { DOCTOR_SEATS: res.doctorSeats },
        BILLING: { BILLING_TERMINALS: res.terminals, STAFF_SEATS: res.staffSeats },
        INVENTORY: { WAREHOUSES: res.warehouses },
        PATIENT: { PATIENT_ADMISSIONS: res.admissions },
      },
      admin_name: admin.name.trim(),
      email_domain: emailDomain,
      admin_email: adminEmail,
      admin_password: admin.password,
      payment_reference: 'PAY_FED_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    };

    try {
      const response = await api.marketplace.registerOrganization(payload);
      const sess = response.session;
      if (sess && sess.token) {
        api.setSession({
          token: sess.token,
          actor: 'Admin',
          role: 'ORG_ADMIN',
          userId: sess.user ? sess.user.user_id : null,
          displayName: sess.user ? sess.user.name : admin.name,
          email: sess.user ? sess.user.email : adminEmail,
          tenant: sess.tenant || null,
        });
      }
      setProvisioned(response.provisioned);
      setStep('success');
      toast('Organization workspace successfully activated!', 'success');
    } catch (err) {
      setSubmitting(false);
      toast(err.message || 'Failed to register organization. Please check details and retry.', 'error');
    }
  }

  const resourceInput = (id, value, onChange) => (
    <input
      type="number"
      id={id}
      className="resource-input"
      min="0"
      value={value}
      onChange={onChange}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--md-outline-variant)' }}
    />
  );

  const cardStyle = {
    padding: 20,
    border: '1px solid var(--md-outline-variant, #cac4d0)',
    borderRadius: 12,
    background: 'var(--md-surface, #fff)',
  };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 4 };
  const labelStyle = { fontSize: '0.85rem', fontWeight: 600 };
  const priceStyle = { fontWeight: 700, color: 'var(--md-primary)' };

  return (
    <>
      <header className="topbar">
        <Link to="/landing/landing-page.html" className="brand">
          <div className="brand-icon">F</div>
          <div className="brand-name">Federico Cloud</div>
        </Link>
        <div className="topbar-right">
          <Link to="/signup/signup-page.html" className="md-btn md-btn-text">Register as Patient</Link>
          <Link to="/login/login-page.html" className="md-btn md-btn-outlined">Sign In</Link>
        </div>
      </header>

      <main className="onboarding-container">
        <div className="stepper-header">
          <div className="stepper-progress-bar">
            <div
              className="stepper-progress-fill"
              id="progress-fill"
              style={{
                width:
                  (((typeof step === 'number' ? step : TOTAL_STEPS) - 1) / (TOTAL_STEPS - 1)) * 100 + '%',
              }}
            />
          </div>
          {[
            [1, 'Hospital Profile'],
            [2, 'Capacity & Scale'],
            [3, 'Admin Account'],
            [4, 'Review & Launch'],
          ].map(([n, label]) => (
            <div
              key={n}
              className={
                'step-node' +
                (step === n ? ' active' : '') +
                (typeof step === 'number' && n < step ? ' completed' : '')
              }
              data-step={n}
            >
              <div className="step-bubble">{n}</div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="onboarding-card">
          <form id="onboarding-form" onSubmit={handleSubmit}>
            {/* STEP 1 */}
            <div className={'step-panel' + (step === 1 ? ' active' : '')} id="panel-step-1">
              <h2 className="step-heading">Hospital &amp; Chain Details</h2>
              <p className="step-description">Tell us about your organization to setup your multi-tenant workspace.</p>

              <div className="form-group">
                <label htmlFor="org-name">Hospital / Chain Name *</label>
                <input type="text" id="org-name" placeholder="e.g. Fortis Healthcare Network" value={org.name} onChange={(e) => setOrg((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div className="form-group">
                <label htmlFor="org-email-domain">Staff Email Domain *</label>
                <input
                  type="text"
                  id="org-email-domain"
                  placeholder="e.g. fortis.com"
                  value={emailDomain}
                  onChange={(e) => setOrg((p) => ({ ...p, emailDomain: e.target.value, domainEdited: true }))}
                />
                <span style={{ fontSize: 12, marginTop: 4, color: domainProblem ? 'var(--status-error, #b3261e)' : 'var(--md-on-surface-variant)' }}>
                  {domainProblem ||
                    'Every staff login uses this domain, e.g. name.hom@' +
                      (emailDomain || 'yourhospital.com') +
                      '. Suggested from your hospital name; you can change it.'}
                </span>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="org-city">Primary City / Campus *</label>
                  <input type="text" id="org-city" placeholder="e.g. Mumbai" value={org.city} onChange={(e) => setOrg((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="org-phone">Contact Phone *</label>
                  <input type="tel" id="org-phone" placeholder="+91 98765 43210" value={org.phone} onChange={(e) => setOrg((p) => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="org-address">Primary Campus Address</label>
                <input type="text" id="org-address" placeholder="e.g. Sector 62, Phase 8, Hospital Road" value={org.address} onChange={(e) => setOrg((p) => ({ ...p, address: e.target.value }))} />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="org-specialties">Specialties (comma separated)</label>
                  <input type="text" id="org-specialties" placeholder="Cardiology, Neurology, Oncology, Orthopedics" value={org.specialties} onChange={(e) => setOrg((p) => ({ ...p, specialties: e.target.value }))} />
                </div>
                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 20 }}>
                    <input type="checkbox" id="org-emergency" checked={org.emergency} onChange={(e) => setOrg((p) => ({ ...p, emergency: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--md-primary)' }} />
                    <span>24x7 Emergency Services Available</span>
                  </label>
                </div>
              </div>

              <div className="stepper-actions">
                <div />
                <button type="button" className="md-btn md-btn-filled" id="btn-next-1" onClick={next1}>
                  Continue to Capacity Setup {'→'}
                </button>
              </div>
            </div>

            {/* STEP 2 */}
            <div className={'step-panel' + (step === 2 ? ' active' : '')} id="panel-step-2">
              <h2 className="step-heading">Hospital Capacity &amp; Resource Scale</h2>
              <p className="step-description">
                Federico includes all 8 core hospital modules with no artificial quota limits.
                Configure your initial beds, staff, and hardware capacity&mdash;pricing automatically
                scales with your usage.
              </p>

              <div style={{ background: 'var(--md-surface-container-low, #f4eff4)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1px solid var(--md-outline-variant, #cac4d0)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--md-primary, #6750A4)', fontSize: '1.05rem' }}>Base Platform License</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--md-on-surface-variant, #49454f)' }}>
                      All 8 Core Modules Unlocked: Appointments, Admissions, Doctors, Ward Mgmt, Billing, Inventory, Insurance &amp; Analytics
                    </p>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--md-primary, #6750A4)' }}>
                    {inr(baseFee)} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--md-on-surface-variant)' }}>/ mo</span>
                  </div>
                </div>
              </div>

              <div className="resource-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card" style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'var(--md-on-surface, #1d1b20)' }}>Inpatient Beds Capacity</h3>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <div style={rowStyle}>
                      <label style={labelStyle}>General Ward Beds ({inr(rates.GENERAL_BEDS)} / bed / mo)</label>
                      <span style={priceStyle} id="cost-general-beds">{inr(costs.genCost)}</span>
                    </div>
                    {resourceInput('res-general-beds', res.generalBeds, setResNum('generalBeds'))}
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <div style={rowStyle}>
                      <label style={labelStyle}>ICU Beds ({inr(rates.ICU_BEDS)} / bed / mo)</label>
                      <span style={priceStyle} id="cost-icu-beds">{inr(costs.icuCost)}</span>
                    </div>
                    {resourceInput('res-icu-beds', res.icuBeds, setResNum('icuBeds'))}
                  </div>
                  <div className="form-group">
                    <div style={rowStyle}>
                      <label style={labelStyle}>Private / Semi-Private ({inr(rates.PRIVATE_BEDS)} / bed / mo)</label>
                      <span style={priceStyle} id="cost-private-beds">{inr(costs.privCost)}</span>
                    </div>
                    {resourceInput('res-private-beds', res.privateBeds, setResNum('privateBeds'))}
                  </div>
                </div>

                <div className="card" style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'var(--md-on-surface, #1d1b20)' }}>Staff &amp; Doctors</h3>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <div style={rowStyle}>
                      <label style={labelStyle}>Doctor Directory Seats ({inr(rates.DOCTOR_SEATS)} / doc / mo)</label>
                      <span style={priceStyle} id="cost-doctor-seats">{inr(costs.docCost)}</span>
                    </div>
                    {resourceInput('res-doctor-seats', res.doctorSeats, setResNum('doctorSeats'))}
                  </div>
                  <div className="form-group">
                    <div style={rowStyle}>
                      <label style={labelStyle}>Staff Accounts (HOM/PRE/FA) ({inr(rates.STAFF_SEATS)} / seat / mo)</label>
                      <span style={priceStyle} id="cost-staff-seats">{inr(costs.staffCost)}</span>
                    </div>
                    {resourceInput('res-staff-seats', res.staffSeats, setResNum('staffSeats'))}
                  </div>
                </div>

                <div className="card" style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'var(--md-on-surface, #1d1b20)' }}>Hardware &amp; Facilities</h3>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <div style={rowStyle}>
                      <label style={labelStyle}>Billing Terminals ({inr(rates.BILLING_TERMINALS)} / terminal / mo)</label>
                      <span style={priceStyle} id="cost-terminals">{inr(costs.termCost)}</span>
                    </div>
                    {resourceInput('res-terminals', res.terminals, setResNum('terminals'))}
                  </div>
                  <div className="form-group">
                    <div style={rowStyle}>
                      <label style={labelStyle}>Central Warehouses ({inr(rates.WAREHOUSES)} / warehouse / mo)</label>
                      <span style={priceStyle} id="cost-warehouses">{inr(costs.whCost)}</span>
                    </div>
                    {resourceInput('res-warehouses', res.warehouses, setResNum('warehouses'))}
                  </div>
                </div>

                <div className="card" style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'var(--md-on-surface, #1d1b20)' }}>Patient Admissions (Usage Volume)</h3>
                  <div className="form-group">
                    <div style={rowStyle}>
                      <label style={labelStyle}>Estimated Admissions / Month ({inr(rates.PATIENT_ADMISSIONS)} / admission)</label>
                      <span style={priceStyle} id="cost-patient-admissions">{inr(costs.admCost)}</span>
                    </div>
                    {resourceInput('res-patient-admissions', res.admissions, setResNum('admissions'))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20, padding: '18px 24px', border: '1px solid var(--md-primary, #6750A4)', borderRadius: 12, background: 'var(--md-surface-container-lowest, #fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--md-on-surface-variant, #49454f)' }}>Estimated Monthly Subscription (Pay As You Scale)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Includes Base License + Selected Capacities + 18% GST (No Artificial Quota Blocks)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--md-primary, #6750A4)' }} id="live-total-price">{inr(costs.total)}/mo</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--md-on-surface-variant)' }} id="live-subtotal-tax">
                    Subtotal: {inr(costs.subtotal)} + GST (18%): {inr(costs.gst)}
                  </div>
                </div>
              </div>

              <div className="stepper-actions" style={{ marginTop: 24 }}>
                <button type="button" className="md-btn md-btn-text" id="btn-back-2" onClick={() => goto(1)}>{'←'} Back</button>
                <button type="button" className="md-btn md-btn-filled" id="btn-next-2" onClick={() => goto(3)}>Continue to Admin Setup {'→'}</button>
              </div>
            </div>

            {/* STEP 3 */}
            <div className={'step-panel' + (step === 3 ? ' active' : '')} id="panel-step-3">
              <h2 className="step-heading">Hospital Administrator Account</h2>
              <p className="step-description">Create the primary administrative owner account for your hospital workspace.</p>

              <div className="form-group">
                <label htmlFor="admin-name">Administrator Full Name *</label>
                <input type="text" id="admin-name" placeholder="e.g. Dr. Rajesh Sharma" value={admin.name} onChange={(e) => setAdmin((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="admin-email">Official Admin Email *</label>
                  <TaggedEmailInput
                    id="admin-email"
                    value={admin.emailName}
                    onChange={(v) => setAdmin((p) => ({ ...p, emailName: v }))}
                    tag="admin"
                    domain={emailDomain}
                    placeholder="e.g. owner"
                    required={false}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="admin-password">Secure Password *</label>
                  <input type="password" id="admin-password" placeholder="Min 6 characters" value={admin.password} onChange={(e) => setAdmin((p) => ({ ...p, password: e.target.value }))} />
                </div>
              </div>

              <div className="stepper-actions">
                <button type="button" className="md-btn md-btn-text" id="btn-back-3" onClick={() => goto(2)}>{'←'} Back</button>
                <button type="button" className="md-btn md-btn-filled" id="btn-next-3" onClick={next3}>Review &amp; Proceed to Checkout {'→'}</button>
              </div>
            </div>

            {/* STEP 4 */}
            <div className={'step-panel' + (step === 4 ? ' active' : '')} id="panel-step-4">
              <h2 className="step-heading">Subscription Review &amp; Activation</h2>
              <p className="step-description">Review your capacity configuration and activate your dedicated hospital workspace.</p>

              <div className="checkout-summary-box">
                <div className="summary-row">
                  <span>Organization:</span>
                  <strong id="summary-org-name">{org.name.trim() || 'Hospital Network'}</strong>
                </div>
                <div className="summary-row">
                  <span>Billing Model:</span>
                  <strong id="summary-plan-name">Pay As You Scale (Resource Usage)</strong>
                </div>
                <div id="summary-resource-breakdown" style={{ padding: '10px 0', borderTop: '1px dashed var(--md-outline-variant)', borderBottom: '1px dashed var(--md-outline-variant)', margin: '8px 0', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>Base Platform License (All 8 Modules)</span><strong>{inr(costs.baseFee)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--md-on-surface-variant)' }}>
                    <span>Inpatient Beds ({res.generalBeds + res.icuBeds + res.privateBeds} total)</span>
                    <span>{inr(costs.genCost + costs.icuCost + costs.privCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--md-on-surface-variant)' }}>
                    <span>Staff &amp; Doctor Directory ({res.doctorSeats + res.staffSeats} seats)</span>
                    <span>{inr(costs.docCost + costs.staffCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--md-on-surface-variant)' }}>
                    <span>Hardware &amp; Warehouses ({res.terminals + res.warehouses} units)</span>
                    <span>{inr(costs.termCost + costs.whCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--md-on-surface-variant)' }}>
                    <span>Patient Volume Usage (~{res.admissions} admissions)</span>
                    <span>{inr(costs.admCost)}</span>
                  </div>
                </div>
                <div className="summary-row"><span>Subtotal (Excl. Tax):</span><span id="summary-plan-price">{inr(costs.subtotal)}</span></div>
                <div className="summary-row"><span>Platform Setup &amp; Provisioning:</span><span style={{ color: '#2e7d32', fontWeight: 600 }}>FREE ({'₹'}0)</span></div>
                <div className="summary-row"><span>Applicable GST (18%):</span><span id="summary-tax">{inr(costs.gst)}</span></div>
                <div className="summary-row total"><span>Total Monthly Amount:</span><span id="summary-total" style={{ color: 'var(--md-primary)' }}>{inr(costs.total)}</span></div>
              </div>

              <h3 style={{ fontSize: '1.05rem', marginBottom: 12 }}>Select Payment Method</h3>
              <div className="payment-method-selector">
                {[['card', 'Credit / Debit Card'], ['upi', 'UPI / QR'], ['netbanking', 'Net Banking / Corporate']].map(([m, label]) => (
                  <div key={m} className={'payment-tab-btn' + (paymentMethod === m ? ' active' : '')} data-method={m} onClick={() => setPaymentMethod(m)}>
                    {label}
                  </div>
                ))}
              </div>

              <div id="payment-fields-card" style={{ display: paymentMethod === 'card' ? 'block' : 'none' }}>
                <div className="form-group"><label>Card Number</label><input type="text" placeholder="4242 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242" /></div>
                <div className="form-grid-2">
                  <div className="form-group"><label>Expiry Date</label><input type="text" placeholder="MM / YY" /></div>
                  <div className="form-group"><label>CVV / CVC</label><input type="password" placeholder="&bull;&bull;&bull;" /></div>
                </div>
              </div>

              <div id="payment-fields-upi" style={{ display: paymentMethod === 'upi' ? 'block' : 'none' }}>
                <div className="form-group"><label>UPI ID / VPA</label><input type="text" placeholder="hospital@okhdfcbank" /></div>
              </div>

              <div id="payment-fields-netbanking" style={{ display: paymentMethod === 'netbanking' ? 'block' : 'none' }}>
                <div className="form-group">
                  <label>Select Corporate Bank</label>
                  <select>
                    <option>HDFC Bank Corporate</option>
                    <option>ICICI Bank Corporate</option>
                    <option>State Bank of India</option>
                    <option>Axis Bank</option>
                  </select>
                </div>
              </div>

              <div className="stepper-actions">
                <button type="button" className="md-btn md-btn-text" id="btn-back-4" onClick={() => goto(3)}>{'←'} Back</button>
                <button type="submit" className="md-btn md-btn-filled" id="btn-pay-submit" disabled={submitting} style={{ background: '#2e7d32', color: '#fff' }}>
                  {submitting ? 'Provisioning Multi-Tenant Cloud Workspace…' : 'Complete Onboarding & Launch Workspace'}
                </button>
              </div>
            </div>

            {/* SUCCESS */}
            <div className={'step-panel' + (step === 'success' ? ' active' : '')} id="panel-step-success">
              <div className="success-banner">
                <div className="success-icon">{'✓'}</div>
                <h2 className="step-heading" style={{ color: '#2e7d32' }}>Workspace Successfully Provisioned!</h2>
                <p className="step-description">Your hospital organization is now live on the Federico Multi-Tenant Cloud.</p>

                <div className="provisioned-details-box" id="provisioned-meta-box">
                  {provisioned ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.9rem' }}>
                        <div><strong>Organization Name:</strong> {provisioned.organization.name}</div>
                        <div><strong>Tenant Identifier:</strong> <code style={{ background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: 4 }}>tenant_{provisioned.organization.organization_id}</code></div>
                        <div><strong>Primary Campus:</strong> {provisioned.hospital.name}</div>
                        <div><strong>Monthly Rate:</strong> {inr(costs.total)} (Incl. GST)</div>
                        <div><strong>Administrator:</strong> {provisioned.admin.email}</div>
                        <div><strong>API Gateway Key:</strong> <code style={{ background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: 4 }}>{provisioned.apiKey ? provisioned.apiKey.key : 'fed_live_...'}</code></div>
                      </div>
                      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--md-outline-variant)', fontSize: '0.85rem', color: 'var(--md-on-surface-variant)' }}>
                        Provisioned Scale: {res.generalBeds + res.icuBeds + res.privateBeds} Beds {'·'} {res.doctorSeats} Doctor Directory Seats {'·'} {res.staffSeats} Staff Accounts {'·'} {res.terminals} Terminals
                      </div>
                    </>
                  ) : null}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 28 }}>
                  <button type="button" className="md-btn md-btn-filled" id="btn-launch-admin" style={{ fontSize: '1.05rem', padding: '12px 28px' }} onClick={() => navigate('/Admin/screen-01-dashboard.html')}>
                    Enter Organization Admin Portal {'→'}
                  </button>
                  <Link to="/marketplace/marketplace-page.html" className="md-btn md-btn-outlined">View in Marketplace</Link>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
