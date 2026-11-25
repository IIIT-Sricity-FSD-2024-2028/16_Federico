'use strict';

import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAppDispatch, useAppSelector, useLoader, useUiState } from '../../store/hooks.js';
import { loadOrgSignup } from '../../store/pageLoaders.js';
import { registerOrganization, selectMarketplaceOrganizations } from '../../store/slices/marketplaceSlice.js';
import { selectPlatformRates } from '../../store/slices/platformSlice.js';
import { toast } from '../../components/feedback/feedback.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import orgSignupCss from '../../styles/signup/org-signup.css?inline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import TaggedEmailInput from '../../components/forms/TaggedEmailInput.jsx';
import { suggestEmailDomain, normalizeDomain, buildTaggedEmail } from '../../lib/emailIdentity.js';
import {
  STEP2_LIMITS,
  CORPORATE_BANKS,
  digitsOnly,
  filterPhoneInput,
  formatCardNumber,
  formatCardExpiry,
  evaluatePasswordRules,
  parseSpecialties,
  toPositiveIntOrNull,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateAllSteps,
} from '../../lib/orgSignupValidation.js';

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

const INITIAL_RESOURCES = {
  generalBeds: '30',
  icuBeds: '5',
  privateBeds: '10',
  doctorSeats: '10',
  staffSeats: '6',
  terminals: '2',
  warehouses: '1',
  admissions: '50',
};

const INITIAL_PAYMENT = {
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  upiId: '',
  bankName: '',
};

const STEP_LABELS = [
  [1, 'Hospital Profile'],
  [2, 'Capacity & Scale'],
  [3, 'Admin Account'],
  [4, 'Review & Launch'],
];

const FIELD_DOM_IDS = {
  '1.name': 'org-name',
  '1.emailDomain': 'org-email-domain',
  '1.city': 'org-city',
  '1.phone': 'org-phone',
  '1.address': 'org-address',
  '1.specialties': 'org-specialties',
  '2.generalBeds': 'res-general-beds',
  '2.icuBeds': 'res-icu-beds',
  '2.privateBeds': 'res-private-beds',
  '2.doctorSeats': 'res-doctor-seats',
  '2.staffSeats': 'res-staff-seats',
  '2.terminals': 'res-terminals',
  '2.warehouses': 'res-warehouses',
  '2.admissions': 'res-patient-admissions',
  '3.name': 'admin-name',
  '3.emailName': 'admin-email',
  '3.password': 'admin-password',
  '4.cardNumber': 'pay-card-number',
  '4.cardExpiry': 'pay-card-exp',
  '4.cardCvv': 'pay-card-csc',
  '4.upiId': 'pay-upi-id',
  '4.bankName': 'pay-bank',
};

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <div id={id} className="field-error">
      <span role="img" aria-label="Error">
        ⚠
      </span>{' '}
      <span>{message}</span>
    </div>
  );
}

/**
 * Ported from signup/org-signup.html + org-signup.js.
 *
 * DEFECT D3 is carried forward deliberately: the live rate card is read as
 * `res.base_fee`, but GET /platform/rates returns `base_platform_fee`. The
 * per-resource rates therefore update from the server while the base platform
 * fee stays pinned at 3000. Do not "fix" this here - constraint 1.
 */
export default function OrgSignupPage() {
  usePageStyles(orgSignupCss);
  useDocumentTitle('Federico — Hospital Chain Onboarding & Provisioning');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [step, setStep] = useUiState('OrgSignup.step', 1);
  const [submitting, setSubmitting] = useUiState('OrgSignup.submitting', false);
  const [provisioned, setProvisioned] = useUiState('OrgSignup.provisioned', null);
  const [paymentMethod, setPaymentMethod] = useUiState('OrgSignup.paymentMethod', 'card');

  const [org, setOrg] = useUiState('OrgSignup.org', {
    name: '',
    city: '',
    phone: '',
    address: '',
    specialties: '',
    emergency: true,
    emailDomain: '',
    domainEdited: false,
  });
  const [admin, setAdmin] = useUiState('OrgSignup.admin', { name: '', emailName: '', password: '' });
  const [res, setRes] = useUiState('OrgSignup.resources', INITIAL_RESOURCES);
  const [payment, setPayment] = useUiState('OrgSignup.payment', INITIAL_PAYMENT);
  const [touched, setTouched] = useUiState('OrgSignup.touched', {});
  const [showPassword, setShowPassword] = useUiState('OrgSignup.showPassword', false);
  const [liveAnnouncement, setLiveAnnouncement] = useUiState('OrgSignup.liveAnnouncement', '');

  const announceTimerRef = useRef(null);
  const headingRefs = useRef({});

  useLoader(loadOrgSignup);
  const knownOrgs = useAppSelector(selectMarketplaceOrganizations);
  const rateCard = useAppSelector(selectPlatformRates);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    };
  }, []);

  // Follows the hospital name (City General Hospital → citygen.com) until edited.
  const emailDomain = org.domainEdited
    ? normalizeDomain(org.emailDomain)
    : org.name.trim()
      ? suggestEmailDomain(org.name, knownOrgs)
      : '';
  const adminEmail = buildTaggedEmail(admin.emailName, 'admin', emailDomain);

  const resNums = useMemo(
    () => ({
      generalBeds: toPositiveIntOrNull(res.generalBeds) ?? 0,
      icuBeds: toPositiveIntOrNull(res.icuBeds) ?? 0,
      privateBeds: toPositiveIntOrNull(res.privateBeds) ?? 0,
      doctorSeats: toPositiveIntOrNull(res.doctorSeats) ?? 0,
      staffSeats: toPositiveIntOrNull(res.staffSeats) ?? 0,
      terminals: toPositiveIntOrNull(res.terminals) ?? 0,
      warehouses: toPositiveIntOrNull(res.warehouses) ?? 0,
      admissions: toPositiveIntOrNull(res.admissions) ?? 0,
    }),
    [res],
  );

  const rateFee = rateCard && rateCard.rates ? (rateCard.base_platform_fee ?? rateCard.base_fee) : undefined;
  const baseFee = typeof rateFee === 'number' ? rateFee : DEFAULT_BASE_FEE;
  const rates = useMemo(
    () => (rateCard && rateCard.rates ? { ...DEFAULT_RATES, ...rateCard.rates } : DEFAULT_RATES),
    [rateCard],
  );

  const costs = useMemo(() => {
    const genCost = resNums.generalBeds * rates.GENERAL_BEDS;
    const icuCost = resNums.icuBeds * rates.ICU_BEDS;
    const privCost = resNums.privateBeds * rates.PRIVATE_BEDS;
    const docCost = resNums.doctorSeats * rates.DOCTOR_SEATS;
    const staffCost = resNums.staffSeats * rates.STAFF_SEATS;
    const termCost = resNums.terminals * rates.BILLING_TERMINALS;
    const whCost = resNums.warehouses * rates.WAREHOUSES;
    const admCost = resNums.admissions * rates.PATIENT_ADMISSIONS;
    const resourceSubtotal =
      genCost + icuCost + privCost + docCost + staffCost + termCost + whCost + admCost;
    const subtotal = baseFee + resourceSubtotal;
    const gst = Math.round(subtotal * 0.18);
    return {
      genCost, icuCost, privCost, docCost, staffCost, termCost, whCost, admCost,
      baseFee, resourceSubtotal, subtotal, gst, total: subtotal + gst,
    };
  }, [resNums, rates, baseFee]);

  const step1Validation = useMemo(
    () => validateStep1(org, { knownOrgs, effectiveEmailDomain: emailDomain }),
    [org, knownOrgs, emailDomain],
  );
  const step2Validation = useMemo(() => validateStep2(res), [res]);
  const step3Validation = useMemo(
    () => validateStep3(admin, { emailDomain }),
    [admin, emailDomain],
  );
  const step4Validation = useMemo(
    () => validateStep4(paymentMethod, payment),
    [paymentMethod, payment],
  );
  const passwordRuleStates = useMemo(() => evaluatePasswordRules(admin.password), [admin.password]);

  const errorsByStep = useMemo(
    () => ({
      1: step1Validation.errors,
      2: step2Validation.errors,
      3: step3Validation.errors,
      4: step4Validation.errors,
    }),
    [step1Validation, step2Validation, step3Validation, step4Validation],
  );

  function visibleError(stepNum, field) {
    const key = `${stepNum}.${field}`;
    return touched[key] ? errorsByStep[stepNum]?.[field] || null : null;
  }

  function scheduleLiveAnnouncement(message) {
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    if (!message) {
      setLiveAnnouncement('');
      return;
    }
    setLiveAnnouncement('');
    announceTimerRef.current = setTimeout(() => {
      setLiveAnnouncement(message);
    }, 450);
  }

  function handleFieldBlur(stepNum, field, labelText) {
    const key = `${stepNum}.${field}`;
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    const err = errorsByStep[stepNum]?.[field];
    if (err) {
      scheduleLiveAnnouncement(labelText ? `${labelText}: ${err}` : err);
    } else {
      scheduleLiveAnnouncement('');
    }
  }

  function markStepTouched(stepNum, fields) {
    setTouched((prev) => {
      const next = { ...prev };
      for (const f of fields) next[`${stepNum}.${f}`] = true;
      return next;
    });
  }

  function focusField(stepNum, field) {
    const domId = FIELD_DOM_IDS[`${stepNum}.${field}`];
    if (!domId) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(domId);
      if (el && typeof el.focus === 'function') {
        el.focus();
      }
    });
  }

  function goto(n) {
    setStep(n);
    setLiveAnnouncement('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => {
      const heading = headingRefs.current[n];
      if (heading && typeof heading.focus === 'function') {
        heading.focus({ preventScroll: true });
      }
    });
  }

  function next1() {
    markStepTouched(1, ['name', 'emailDomain', 'city', 'phone', 'address', 'specialties']);
    if (!step1Validation.valid) {
      const firstErr = step1Validation.errors[step1Validation.firstErrorField];
      toast(firstErr, 'warning');
      focusField(1, step1Validation.firstErrorField);
      return;
    }
    goto(2);
  }

  function next2() {
    markStepTouched(2, Object.keys(STEP2_LIMITS));
    if (!step2Validation.valid) {
      const firstErr = step2Validation.errors[step2Validation.firstErrorField];
      toast(firstErr, 'warning');
      focusField(2, step2Validation.firstErrorField);
      return;
    }
    goto(3);
  }

  function next3() {
    markStepTouched(3, ['name', 'emailName', 'password']);
    if (!step3Validation.valid) {
      const firstErr = step3Validation.errors[step3Validation.firstErrorField];
      toast(firstErr, 'warning');
      focusField(3, step3Validation.firstErrorField);
      return;
    }
    goto(4);
  }

  const setResDigits = (k) => (e) => {
    const cleaned = digitsOnly(e.target.value, 7);
    setRes((p) => ({ ...p, [k]: cleaned }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (step === 1) {
      next1();
      return;
    }
    if (step === 2) {
      next2();
      return;
    }
    if (step === 3) {
      next3();
      return;
    }
    if (step !== 4) return;

    const paymentFields =
      paymentMethod === 'card'
        ? ['cardNumber', 'cardExpiry', 'cardCvv']
        : paymentMethod === 'upi'
          ? ['upiId']
          : ['bankName'];
    markStepTouched(4, paymentFields);

    const fullCheck = validateAllSteps({
      org,
      res,
      admin,
      paymentMethod,
      payment,
      knownOrgs,
      effectiveEmailDomain: emailDomain,
    });

    if (!fullCheck.valid) {
      const badStep = fullCheck.firstInvalidStep;
      const stepRes = fullCheck.steps[badStep];
      const msg = stepRes.errors[stepRes.firstErrorField];
      toast(msg, 'warning');
      if (badStep !== 4) {
        goto(badStep);
      }
      focusField(badStep, stepRes.firstErrorField);
      return;
    }

    setSubmitting(true);

    const parsedSpec = parseSpecialties(org.specialties);
    const specialties = parsedSpec.items.length ? parsedSpec.items : ['General Medicine'];

    const paymentSummary =
      paymentMethod === 'card'
        ? { last4: digitsOnly(payment.cardNumber, 19).slice(-4) }
        : paymentMethod === 'upi'
          ? { upi_id: payment.upiId.trim() }
          : { bank_name: payment.bankName };

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
          GENERAL_BEDS: resNums.generalBeds,
          ICU_BEDS: resNums.icuBeds,
          PRIVATE_BEDS: resNums.privateBeds,
        },
        DOCTOR: { DOCTOR_SEATS: resNums.doctorSeats },
        BILLING: { BILLING_TERMINALS: resNums.terminals, STAFF_SEATS: resNums.staffSeats },
        INVENTORY: { WAREHOUSES: resNums.warehouses },
        PATIENT: { PATIENT_ADMISSIONS: resNums.admissions },
      },
      admin_name: admin.name.trim(),
      email_domain: emailDomain,
      admin_email: adminEmail,
      admin_password: admin.password,
      payment_method: paymentMethod,
      payment_summary: paymentSummary,
      payment_reference: 'PAY_FED_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    };

    try {
      const response = await dispatch(registerOrganization(payload)).unwrap();
      // Scrub sensitive card fields from UI state immediately after checkout.
      setPayment((prev) => ({ ...prev, cardNumber: '', cardExpiry: '', cardCvv: '' }));
      setProvisioned(response.provisioned);
      setStep('success');
      toast('Organization workspace successfully activated!', 'success');
    } catch (err) {
      setSubmitting(false);
      toast(err.message || 'Failed to register organization. Please check details and retry.', 'error');
    }
  }

  const buildDescribedBy = (hintId, errorId, errMsg) => {
    const ids = [];
    if (hintId) ids.push(hintId);
    if (errMsg && errorId) ids.push(errorId);
    return ids.length ? ids.join(' ') : undefined;
  };

  const renderResourceField = (fieldKey, unitText, costAmount, enterHint = 'next') => {
    const meta = STEP2_LIMITS[fieldKey];
    const err = visibleError(2, fieldKey);
    const errorId = `${meta.id}-error`;
    return (
      <div className={'form-group' + (err ? ' has-error' : '')}>
        <div style={rowStyle}>
          <label htmlFor={meta.id} style={labelStyle}>
            {meta.label} * ({unitText})
          </label>
          <span style={priceStyle} id={meta.id.replace('res-', 'cost-')}>
            {inr(costAmount)}
          </span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          id={meta.id}
          name={fieldKey}
          className="resource-input"
          required
          enterKeyHint={enterHint}
          aria-invalid={err ? 'true' : 'false'}
          aria-describedby={buildDescribedBy(null, errorId, err)}
          value={res[fieldKey]}
          onChange={setResDigits(fieldKey)}
          onBlur={() => handleFieldBlur(2, fieldKey, meta.label)}
        />
        <FieldError id={errorId} message={err} />
      </div>
    );
  };

  const cardStyle = {
    padding: 20,
    border: '1px solid var(--md-outline-variant, #cac4d0)',
    borderRadius: 12,
    background: 'var(--md-surface, #fff)',
  };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 };
  const labelStyle = { fontSize: '0.85rem', fontWeight: 600 };
  const priceStyle = { fontWeight: 700, color: 'var(--md-primary)', whiteSpace: 'nowrap' };

  const step1NameErr = visibleError(1, 'name');
  const step1DomainErr = visibleError(1, 'emailDomain');
  const step1CityErr = visibleError(1, 'city');
  const step1PhoneErr = visibleError(1, 'phone');
  const step1AddressErr = visibleError(1, 'address');
  const step1SpecialtiesErr = visibleError(1, 'specialties');

  const step3NameErr = visibleError(3, 'name');
  const step3EmailErr = visibleError(3, 'emailName');
  const step3PassErr = visibleError(3, 'password');

  const step4CardNumErr = visibleError(4, 'cardNumber');
  const step4CardExpErr = visibleError(4, 'cardExpiry');
  const step4CardCvvErr = visibleError(4, 'cardCvv');
  const step4UpiErr = visibleError(4, 'upiId');
  const step4BankErr = visibleError(4, 'bankName');

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

      <div className="visually-hidden" aria-live="polite">
        {liveAnnouncement}
      </div>

      <main className="onboarding-container">
        <nav className="stepper-header" aria-label="Onboarding progress">
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
          {STEP_LABELS.map(([n, label]) => (
            <div
              key={n}
              className={
                'step-node' +
                (step === n ? ' active' : '') +
                (typeof step === 'number' && n < step ? ' completed' : '')
              }
              aria-current={step === n ? 'step' : undefined}
              data-step={n}
            >
              <div className="step-bubble">{n}</div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </nav>

        <div className="onboarding-card">
          <form id="onboarding-form" noValidate onSubmit={handleSubmit}>
            {/* STEP 1 */}
            <div className={'step-panel' + (step === 1 ? ' active' : '')} id="panel-step-1" hidden={step !== 1}>
              <h2
                className="step-heading"
                tabIndex={-1}
                ref={(el) => {
                  headingRefs.current[1] = el;
                }}
              >
                Hospital &amp; Chain Details
              </h2>
              <p className="step-description">Tell us about your organization to setup your multi-tenant workspace.</p>

              <div className={'form-group' + (step1NameErr ? ' has-error' : '')}>
                <label htmlFor="org-name">Hospital / Chain Name *</label>
                <input
                  type="text"
                  id="org-name"
                  name="orgName"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="organization"
                  enterKeyHint="next"
                  placeholder="e.g. Fortis Healthcare Network"
                  aria-invalid={step1NameErr ? 'true' : 'false'}
                  aria-describedby={buildDescribedBy(null, 'org-name-error', step1NameErr)}
                  value={org.name}
                  onChange={(e) => setOrg((p) => ({ ...p, name: e.target.value }))}
                  onBlur={() => handleFieldBlur(1, 'name', 'Hospital / Chain Name')}
                />
                <FieldError id="org-name-error" message={step1NameErr} />
              </div>

              <div className={'form-group' + (step1DomainErr ? ' has-error' : '')}>
                <label htmlFor="org-email-domain">Staff Email Domain *</label>
                <span id="org-email-domain-hint" className="field-hint">
                  {'Every staff login uses this domain, e.g. name.hom@' +
                    (emailDomain || 'yourhospital.com') +
                    '. Suggested from your hospital name; you can edit it.'}
                </span>
                <input
                  type="text"
                  id="org-email-domain"
                  name="emailDomain"
                  required
                  maxLength={253}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder="e.g. fortis.com"
                  aria-invalid={step1DomainErr ? 'true' : 'false'}
                  aria-describedby={buildDescribedBy('org-email-domain-hint', 'org-email-domain-error', step1DomainErr)}
                  value={org.domainEdited ? org.emailDomain : emailDomain}
                  onChange={(e) => setOrg((p) => ({ ...p, emailDomain: e.target.value, domainEdited: true }))}
                  onBlur={() => {
                    if (org.domainEdited) {
                      setOrg((p) => ({ ...p, emailDomain: normalizeDomain(p.emailDomain) }));
                    }
                    handleFieldBlur(1, 'emailDomain', 'Staff Email Domain');
                  }}
                />
                <FieldError id="org-email-domain-error" message={step1DomainErr} />
              </div>

              <div className="form-grid-2">
                <div className={'form-group' + (step1CityErr ? ' has-error' : '')}>
                  <label htmlFor="org-city">Primary City / Campus *</label>
                  <input
                    type="text"
                    id="org-city"
                    name="city"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="address-level2"
                    enterKeyHint="next"
                    placeholder="e.g. Mumbai"
                    aria-invalid={step1CityErr ? 'true' : 'false'}
                    aria-describedby={buildDescribedBy(null, 'org-city-error', step1CityErr)}
                    value={org.city}
                    onChange={(e) => setOrg((p) => ({ ...p, city: e.target.value }))}
                    onBlur={() => handleFieldBlur(1, 'city', 'Primary City / Campus')}
                  />
                  <FieldError id="org-city-error" message={step1CityErr} />
                </div>
                <div className={'form-group' + (step1PhoneErr ? ' has-error' : '')}>
                  <label htmlFor="org-phone">Contact Phone *</label>
                  <span id="org-phone-hint" className="field-hint">
                    10-digit number (auto +91) or international format (e.g. +91 98765 43210).
                  </span>
                  <input
                    type="tel"
                    id="org-phone"
                    name="phone"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={20}
                    enterKeyHint="next"
                    placeholder="+91 98765 43210"
                    aria-invalid={step1PhoneErr ? 'true' : 'false'}
                    aria-describedby={buildDescribedBy('org-phone-hint', 'org-phone-error', step1PhoneErr)}
                    value={org.phone}
                    onChange={(e) => setOrg((p) => ({ ...p, phone: filterPhoneInput(e.target.value) }))}
                    onBlur={() => handleFieldBlur(1, 'phone', 'Contact Phone')}
                  />
                  <FieldError id="org-phone-error" message={step1PhoneErr} />
                </div>
              </div>

              <div className={'form-group' + (step1AddressErr ? ' has-error' : '')}>
                <label htmlFor="org-address">Primary Campus Address</label>
                <input
                  type="text"
                  id="org-address"
                  name="address"
                  maxLength={250}
                  autoComplete="street-address"
                  enterKeyHint="next"
                  placeholder="e.g. Sector 62, Phase 8, Hospital Road"
                  aria-invalid={step1AddressErr ? 'true' : 'false'}
                  aria-describedby={buildDescribedBy(null, 'org-address-error', step1AddressErr)}
                  value={org.address}
                  onChange={(e) => setOrg((p) => ({ ...p, address: e.target.value }))}
                  onBlur={() => handleFieldBlur(1, 'address', 'Primary Campus Address')}
                />
                <FieldError id="org-address-error" message={step1AddressErr} />
              </div>

              <div className="form-grid-2">
                <div className={'form-group' + (step1SpecialtiesErr ? ' has-error' : '')}>
                  <label htmlFor="org-specialties">Specialties (comma separated)</label>
                  <span id="org-specialties-hint" className="field-hint">
                    Optional; defaults to General Medicine if left blank.
                  </span>
                  <input
                    type="text"
                    id="org-specialties"
                    name="specialties"
                    maxLength={300}
                    enterKeyHint="next"
                    placeholder="Cardiology, Neurology, Oncology, Orthopedics"
                    aria-invalid={step1SpecialtiesErr ? 'true' : 'false'}
                    aria-describedby={buildDescribedBy('org-specialties-hint', 'org-specialties-error', step1SpecialtiesErr)}
                    value={org.specialties}
                    onChange={(e) => setOrg((p) => ({ ...p, specialties: e.target.value }))}
                    onBlur={() => handleFieldBlur(1, 'specialties', 'Specialties')}
                  />
                  <FieldError id="org-specialties-error" message={step1SpecialtiesErr} />
                </div>
                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <label htmlFor="org-emergency" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 20 }}>
                    <input
                      type="checkbox"
                      id="org-emergency"
                      name="emergency"
                      checked={org.emergency}
                      onChange={(e) => setOrg((p) => ({ ...p, emergency: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: 'var(--md-primary)' }}
                    />
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
            <div className={'step-panel' + (step === 2 ? ' active' : '')} id="panel-step-2" hidden={step !== 2}>
              <h2
                className="step-heading"
                tabIndex={-1}
                ref={(el) => {
                  headingRefs.current[2] = el;
                }}
              >
                Hospital Capacity &amp; Resource Scale
              </h2>
              <p className="step-description">
                Federico includes all 8 core hospital modules with no artificial quota limits.
                Configure your initial beds, staff, and hardware capacity (minimum 1 each)&mdash;pricing
                automatically scales with your usage.
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
                  {renderResourceField('generalBeds', `${inr(rates.GENERAL_BEDS)} / bed / mo`, costs.genCost)}
                  {renderResourceField('icuBeds', `${inr(rates.ICU_BEDS)} / bed / mo`, costs.icuCost)}
                  {renderResourceField('privateBeds', `${inr(rates.PRIVATE_BEDS)} / bed / mo`, costs.privCost)}
                </div>

                <div className="card" style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'var(--md-on-surface, #1d1b20)' }}>Staff &amp; Doctors</h3>
                  {renderResourceField('doctorSeats', `${inr(rates.DOCTOR_SEATS)} / doc / mo`, costs.docCost)}
                  {renderResourceField('staffSeats', `${inr(rates.STAFF_SEATS)} / seat / mo`, costs.staffCost)}
                </div>

                <div className="card" style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'var(--md-on-surface, #1d1b20)' }}>Hardware &amp; Facilities</h3>
                  {renderResourceField('terminals', `${inr(rates.BILLING_TERMINALS)} / terminal / mo`, costs.termCost)}
                  {renderResourceField('warehouses', `${inr(rates.WAREHOUSES)} / warehouse / mo`, costs.whCost)}
                </div>

                <div className="card" style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'var(--md-on-surface, #1d1b20)' }}>Patient Admissions (Usage Volume)</h3>
                  {renderResourceField('admissions', `${inr(rates.PATIENT_ADMISSIONS)} / admission`, costs.admCost, 'done')}
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
                <button type="button" className="md-btn md-btn-filled" id="btn-next-2" onClick={next2}>Continue to Admin Setup {'→'}</button>
              </div>
            </div>

            {/* STEP 3 */}
            <div className={'step-panel' + (step === 3 ? ' active' : '')} id="panel-step-3" hidden={step !== 3}>
              <h2
                className="step-heading"
                tabIndex={-1}
                ref={(el) => {
                  headingRefs.current[3] = el;
                }}
              >
                Hospital Administrator Account
              </h2>
              <p className="step-description">Create the primary administrative owner account for your hospital workspace.</p>

              <div className={'form-group' + (step3NameErr ? ' has-error' : '')}>
                <label htmlFor="admin-name">Administrator Full Name *</label>
                <input
                  type="text"
                  id="admin-name"
                  name="adminName"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  enterKeyHint="next"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  aria-invalid={step3NameErr ? 'true' : 'false'}
                  aria-describedby={buildDescribedBy(null, 'admin-name-error', step3NameErr)}
                  value={admin.name}
                  onChange={(e) => setAdmin((p) => ({ ...p, name: e.target.value }))}
                  onBlur={() => handleFieldBlur(3, 'name', 'Administrator Full Name')}
                />
                <FieldError id="admin-name-error" message={step3NameErr} />
              </div>

              <div className="form-grid-2">
                <div className={'form-group' + (step3EmailErr ? ' has-error' : '')}>
                  <label htmlFor="admin-email">Official Admin Email *</label>
                  <span id="admin-email-hint" className="field-hint">
                    Letters, numbers, ., _, - only (2–40 chars).
                  </span>
                  <TaggedEmailInput
                    id="admin-email"
                    name="adminEmailName"
                    value={admin.emailName}
                    onChange={(v) => setAdmin((p) => ({ ...p, emailName: v }))}
                    onBlur={() => handleFieldBlur(3, 'emailName', 'Official Admin Email')}
                    tag="admin"
                    domain={emailDomain}
                    placeholder="e.g. owner"
                    required
                    sanitize={false}
                    maxLength={40}
                    enterKeyHint="next"
                    ariaInvalid={step3EmailErr ? 'true' : 'false'}
                    ariaDescribedBy={buildDescribedBy('admin-email-hint', 'admin-email-error', step3EmailErr)}
                  />
                  <FieldError id="admin-email-error" message={step3EmailErr} />
                </div>

                <div className={'form-group' + (step3PassErr ? ' has-error' : '')}>
                  <label htmlFor="admin-password">Secure Password *</label>
                  <ul id="admin-password-rules" className={'password-rules-list' + (step3PassErr ? ' is-error' : '')}>
                    {passwordRuleStates.map((rule) => (
                      <li key={rule.id} className={admin.password && rule.met ? 'is-met' : undefined}>
                        <span aria-hidden="true">{admin.password && rule.met ? '✓' : '•'}</span> {rule.label}
                      </li>
                    ))}
                  </ul>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="admin-password"
                      name="adminPassword"
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      enterKeyHint="done"
                      placeholder="Create a strong 8+ character password"
                      aria-invalid={step3PassErr ? 'true' : 'false'}
                      aria-describedby={buildDescribedBy('admin-password-rules', 'admin-password-error', step3PassErr)}
                      value={admin.password}
                      onChange={(e) => setAdmin((p) => ({ ...p, password: e.target.value }))}
                      onBlur={() => handleFieldBlur(3, 'password', 'Secure Password')}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                  <FieldError id="admin-password-error" message={step3PassErr} />
                </div>
              </div>

              <div className="stepper-actions">
                <button type="button" className="md-btn md-btn-text" id="btn-back-3" onClick={() => goto(2)}>{'←'} Back</button>
                <button type="button" className="md-btn md-btn-filled" id="btn-next-3" onClick={next3}>Review &amp; Proceed to Checkout {'→'}</button>
              </div>
            </div>

            {/* STEP 4 */}
            <div className={'step-panel' + (step === 4 ? ' active' : '')} id="panel-step-4" hidden={step !== 4}>
              <h2
                className="step-heading"
                tabIndex={-1}
                ref={(el) => {
                  headingRefs.current[4] = el;
                }}
              >
                Subscription Review &amp; Activation
              </h2>
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
                    <span>Inpatient Beds ({resNums.generalBeds + resNums.icuBeds + resNums.privateBeds} total)</span>
                    <span>{inr(costs.genCost + costs.icuCost + costs.privCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--md-on-surface-variant)' }}>
                    <span>Staff &amp; Doctor Directory ({resNums.doctorSeats + resNums.staffSeats} seats)</span>
                    <span>{inr(costs.docCost + costs.staffCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--md-on-surface-variant)' }}>
                    <span>Hardware &amp; Warehouses ({resNums.terminals + resNums.warehouses} units)</span>
                    <span>{inr(costs.termCost + costs.whCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--md-on-surface-variant)' }}>
                    <span>Patient Volume Usage (~{resNums.admissions} admissions)</span>
                    <span>{inr(costs.admCost)}</span>
                  </div>
                </div>
                <div className="summary-row"><span>Subtotal (Excl. Tax):</span><span id="summary-plan-price">{inr(costs.subtotal)}</span></div>
                <div className="summary-row"><span>Platform Setup &amp; Provisioning:</span><span style={{ color: '#2e7d32', fontWeight: 600 }}>FREE ({'₹'}0)</span></div>
                <div className="summary-row"><span>Applicable GST (18%):</span><span id="summary-tax">{inr(costs.gst)}</span></div>
                <div className="summary-row total"><span>Total Monthly Amount:</span><span id="summary-total" style={{ color: 'var(--md-primary)' }}>{inr(costs.total)}</span></div>
              </div>

              <h3 id="payment-method-heading" style={{ fontSize: '1.05rem', marginBottom: 12 }}>Select Payment Method *</h3>
              <div className="payment-method-selector" role="tablist" aria-labelledby="payment-method-heading">
                {[['card', 'Credit / Debit Card'], ['upi', 'UPI / QR'], ['netbanking', 'Net Banking / Corporate']].map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={paymentMethod === m}
                    className={'payment-tab-btn' + (paymentMethod === m ? ' active' : '')}
                    data-method={m}
                    onClick={() => {
                      setPaymentMethod(m);
                      setLiveAnnouncement('');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div id="payment-fields-card" hidden={paymentMethod !== 'card'}>
                <div className={'form-group' + (step4CardNumErr ? ' has-error' : '')}>
                  <label htmlFor="pay-card-number">Card Number *</label>
                  <span id="pay-card-number-hint" className="field-hint">
                    Digits only (13–19 digits, e.g. 4242 4242 4242 4242).
                  </span>
                  <input
                    type="text"
                    id="pay-card-number"
                    name="cardNumber"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    maxLength={23}
                    required={paymentMethod === 'card'}
                    enterKeyHint="next"
                    placeholder="4242 4242 4242 4242"
                    aria-invalid={step4CardNumErr ? 'true' : 'false'}
                    aria-describedby={buildDescribedBy('pay-card-number-hint', 'pay-card-number-error', step4CardNumErr)}
                    value={payment.cardNumber}
                    onChange={(e) => setPayment((p) => ({ ...p, cardNumber: formatCardNumber(e.target.value) }))}
                    onBlur={() => handleFieldBlur(4, 'cardNumber', 'Card Number')}
                  />
                  <FieldError id="pay-card-number-error" message={step4CardNumErr} />
                </div>
                <div className="form-grid-2">
                  <div className={'form-group' + (step4CardExpErr ? ' has-error' : '')}>
                    <label htmlFor="pay-card-exp">Expiry Date *</label>
                    <span id="pay-card-exp-hint" className="field-hint">
                      Format: MM / YY
                    </span>
                    <input
                      type="text"
                      id="pay-card-exp"
                      name="cardExpiry"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      maxLength={7}
                      required={paymentMethod === 'card'}
                      enterKeyHint="next"
                      placeholder="MM / YY"
                      aria-invalid={step4CardExpErr ? 'true' : 'false'}
                      aria-describedby={buildDescribedBy('pay-card-exp-hint', 'pay-card-exp-error', step4CardExpErr)}
                      value={payment.cardExpiry}
                      onChange={(e) =>
                        setPayment((p) => ({ ...p, cardExpiry: formatCardExpiry(e.target.value, p.cardExpiry) }))
                      }
                      onBlur={() => handleFieldBlur(4, 'cardExpiry', 'Expiry Date')}
                    />
                    <FieldError id="pay-card-exp-error" message={step4CardExpErr} />
                  </div>
                  <div className={'form-group' + (step4CardCvvErr ? ' has-error' : '')}>
                    <label htmlFor="pay-card-csc">CVV / CVC *</label>
                    <span id="pay-card-csc-hint" className="field-hint">
                      3 or 4 digit security code.
                    </span>
                    <input
                      type="text"
                      id="pay-card-csc"
                      name="cardCvv"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      maxLength={4}
                      required={paymentMethod === 'card'}
                      enterKeyHint="done"
                      placeholder="123"
                      aria-invalid={step4CardCvvErr ? 'true' : 'false'}
                      aria-describedby={buildDescribedBy('pay-card-csc-hint', 'pay-card-csc-error', step4CardCvvErr)}
                      value={payment.cardCvv}
                      onChange={(e) => setPayment((p) => ({ ...p, cardCvv: digitsOnly(e.target.value, 4) }))}
                      onBlur={() => handleFieldBlur(4, 'cardCvv', 'CVV / CVC')}
                    />
                    <FieldError id="pay-card-csc-error" message={step4CardCvvErr} />
                  </div>
                </div>
              </div>

              <div id="payment-fields-upi" hidden={paymentMethod !== 'upi'}>
                <div className={'form-group' + (step4UpiErr ? ' has-error' : '')}>
                  <label htmlFor="pay-upi-id">UPI ID / VPA *</label>
                  <span id="pay-upi-hint" className="field-hint">
                    Format: name@bankhandle (e.g. hospital@okhdfcbank).
                  </span>
                  <input
                    type="text"
                    id="pay-upi-id"
                    name="upiId"
                    maxLength={320}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required={paymentMethod === 'upi'}
                    enterKeyHint="done"
                    placeholder="hospital@okhdfcbank"
                    aria-invalid={step4UpiErr ? 'true' : 'false'}
                    aria-describedby={buildDescribedBy('pay-upi-hint', 'pay-upi-id-error', step4UpiErr)}
                    value={payment.upiId}
                    onChange={(e) => setPayment((p) => ({ ...p, upiId: e.target.value.replace(/\s+/g, '') }))}
                    onBlur={() => handleFieldBlur(4, 'upiId', 'UPI ID / VPA')}
                  />
                  <FieldError id="pay-upi-id-error" message={step4UpiErr} />
                </div>
              </div>

              <div id="payment-fields-netbanking" hidden={paymentMethod !== 'netbanking'}>
                <div className={'form-group' + (step4BankErr ? ' has-error' : '')}>
                  <label htmlFor="pay-bank">Select Corporate Bank *</label>
                  <select
                    id="pay-bank"
                    name="bankName"
                    required={paymentMethod === 'netbanking'}
                    aria-invalid={step4BankErr ? 'true' : 'false'}
                    aria-describedby={buildDescribedBy(null, 'pay-bank-error', step4BankErr)}
                    value={payment.bankName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPayment((p) => ({ ...p, bankName: val }));
                      setTouched((prev) => ({ ...prev, '4.bankName': true }));
                      if (val) scheduleLiveAnnouncement('');
                    }}
                    onBlur={() => handleFieldBlur(4, 'bankName', 'Select Corporate Bank')}
                  >
                    <option value="">Select a corporate bank</option>
                    {CORPORATE_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                  <FieldError id="pay-bank-error" message={step4BankErr} />
                </div>
              </div>

              <div className="stepper-actions">
                <button type="button" className="md-btn md-btn-text" id="btn-back-4" onClick={() => goto(3)}>{'←'} Back</button>
                <button type="submit" className="md-btn md-btn-filled" id="btn-pay-submit" disabled={submitting} style={{ background: '#2e7d32', color: '#fff' }}>
                  {submitting ? 'Provisioning Multi-Tenant Cloud Workspace…' : `Pay ${inr(costs.total)} & Launch Workspace`}
                </button>
              </div>
            </div>

            {/* SUCCESS */}
            <div className={'step-panel' + (step === 'success' ? ' active' : '')} id="panel-step-success" hidden={step !== 'success'}>
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
                        Provisioned Scale: {resNums.generalBeds + resNums.icuBeds + resNums.privateBeds} Beds {'·'} {resNums.doctorSeats} Doctor Directory Seats {'·'} {resNums.staffSeats} Staff Accounts {'·'} {resNums.terminals} Terminals
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
