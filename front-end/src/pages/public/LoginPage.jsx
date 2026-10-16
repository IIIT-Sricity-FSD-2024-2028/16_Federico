'use strict';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Info,
} from 'lucide-react';
import { api } from '../../api/index.js';
import { useSession } from '../../auth/useSession.js';
import { useSearchParam } from '../../hooks/useSearchParam.js';
import { resolveLoginIdentity, PORTAL_LABEL } from '../../lib/emailIdentity.js';
import { getActorHome } from '../../auth/actorHome.js';
import { toast } from '../../components/feedback/feedback.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import loginPageCss from '../../styles/login/login-page.css?inline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import HospitalBackground from '../../components/landing/HospitalBackground.jsx';

const REMEMBER_KEY = 'FedericoRememberMe';
// How long the email must sit still before the portal chip reacts.
const IDENTITY_SETTLE_MS = 300;
const DEMO_ROLE_ORDER = ['Admin', 'HOM', 'PRE', 'FA', 'Patient'];
const PLATFORM_DEMO_TAB = 'platform';

/** The Remember Me entry, or null when absent or corrupt. */
function readRemembered() {
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Unified Apple-style sign-in page for every healthcare actor.
 * Demonstrates clean hospital visual language, side-by-side demo credentials,
 * capsule controls, and zero emojis.
 */
export default function LoginPage() {
  usePageStyles(loginPageCss);
  useDocumentTitle('Federico — Secure Portal Sign In');
  const navigate = useNavigate();
  const { authenticate, getLastAuthError, isPlatformUser } = useSession();
  const preselectOrg = useSearchParam('org');

  const [remembered] = useState(readRemembered);
  const [organizations, setOrganizations] = useState(null); // null = loading
  const [demoData, setDemoData] = useState(null);
  const [orgId, setOrgId] = useState('');
  const [orgTouched, setOrgTouched] = useState(false);
  const [multiOrgs, setMultiOrgs] = useState(null);
  const [email, setEmail] = useState(remembered?.email || '');
  const [settledEmail, setSettledEmail] = useState(remembered?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(Boolean(remembered));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoTab, setDemoTab] = useState(null);

  // Already signed in as platform super user?
  useEffect(() => {
    if (isPlatformUser) navigate(getActorHome('PLATFORM'), { replace: true });
  }, [isPlatformUser, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setSettledEmail(email), IDENTITY_SETTLE_MS);
    return () => clearTimeout(t);
  }, [email]);

  // Load public organizations and dynamic demo credentials from backend.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orgs, demoAccounts] = await Promise.all([
          api.marketplace.organizations().catch(() => []),
          api.auth.demoAccounts().catch(() => null),
        ]);
        if (cancelled) return;
        setOrganizations(orgs || []);
        setDemoData(demoAccounts);

        const rememberedOrgId = readRemembered()?.orgId;
        if (preselectOrg && (orgs || []).some((o) => String(o.organization_id) === preselectOrg)) {
          setOrgId(preselectOrg);
          setOrgTouched(true);
        } else if (
          rememberedOrgId &&
          (orgs || []).some((o) => String(o.organization_id) === String(rememberedOrgId))
        ) {
          setOrgId(String(rememberedOrgId));
          setOrgTouched(true);
        }
      } catch {
        if (cancelled) return;
        setOrganizations([]);
        toast('Could not load organizations. Please refresh.', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preselectOrg]);

  const identity = useMemo(
    () => resolveLoginIdentity(settledEmail, organizations),
    [settledEmail, organizations],
  );
  const isPatient = identity?.actor === 'Patient';

  const demoOrgTabs = useMemo(() => {
    if (demoData?.organizations) {
      return Object.values(demoData.organizations);
    }
    return [];
  }, [demoData]);

  const activeDemoTab =
    demoTab ||
    (identity?.actor === 'PLATFORM'
      ? PLATFORM_DEMO_TAB
      : String(
          demoOrgTabs.some((o) => String(o.organization_id) === orgId)
            ? orgId
            : demoOrgTabs[0]?.organization_id || '1',
        ));

  const demoRows = useMemo(() => {
    if (activeDemoTab === PLATFORM_DEMO_TAB) {
      const platAccount = demoData?.platform || {
        email: 'super.platform@federico.com',
        password: 'Federico@Platform123',
        displayName: 'Platform Super User',
        purpose: 'Super Admin — Tenant provisioning, subscription tiers, and system metrics',
      };
      return [{ role: 'Platform', account: platAccount }];
    }
    const orgInfo = demoData?.organizations?.[activeDemoTab];
    if (!orgInfo?.roles) return [];
    return DEMO_ROLE_ORDER.flatMap((role) =>
      (orgInfo.roles[role] || []).map((account) => ({ role, account })),
    );
  }, [demoData, activeDemoTab]);

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please provide both your registered email and password.');
      return;
    }
    if (organizations === null) {
      setError('System initializing, please try again in a few moments.');
      return;
    }

    const target = resolveLoginIdentity(trimmedEmail, organizations);
    if (!target) {
      setError('Please enter a valid email address.');
      return;
    }

    let organizationId = null;
    if (multiOrgs && orgId) {
      organizationId = Number(orgId);
    } else if (target.actor === 'Patient') {
      organizationId = orgTouched && orgId ? Number(orgId) : null;
    } else if (target.org) {
      organizationId = target.org.organization_id;
    }

    setSubmitting(true);
    try {
      const authResult = await authenticate(target.actor, trimmedEmail, password, organizationId);
      if (!authResult) {
        setError(getLastAuthError() || 'Invalid credentials. Please verify and try again.');
        setSubmitting(false);
        return;
      }

      if (authResult.requiresOrganizationSelection) {
        setMultiOrgs(authResult.organizations || []);
        if (authResult.organizations && authResult.organizations.length > 0) {
          setOrgId(String(authResult.organizations[0].organization_id));
          setOrgTouched(true);
        }
        setError('');
        setSubmitting(false);
        return;
      }

      setError('');

      try {
        if (remember) {
          localStorage.setItem(
            REMEMBER_KEY,
            JSON.stringify({
              email: trimmedEmail,
              orgId: target.actor === 'Patient' ? organizationId : null,
            }),
          );
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        /* storage unavailable; login still succeeded */
      }

      navigate(getActorHome(authResult.actor));
    } catch (err) {
      setError(err?.status === 0 ? err.message : 'Authentication service error. Please try again.');
      setSubmitting(false);
    }
  }, [email, password, organizations, multiOrgs, orgId, orgTouched, remember, authenticate, getLastAuthError, navigate]);

  function fillDemo(account, targetOrgId) {
    setEmail(account.email);
    setSettledEmail(account.email);
    setPassword(account.password);
    if (targetOrgId && targetOrgId !== PLATFORM_DEMO_TAB) {
      setOrgId(String(targetOrgId));
      setOrgTouched(true);
    } else {
      setOrgId('');
      setOrgTouched(false);
    }
    setMultiOrgs(null);
    setError('');
    toast(`Credentials for ${account.displayName} copied to sign-in form`, 'info');
  }

  let portalChip;
  if (!identity) {
    portalChip = (
      <span className="portal-chip-idle">
        Staff: name.role@hospital-domain · Patients: your personal email
      </span>
    );
  } else if (identity.actor === 'PLATFORM') {
    portalChip = (
      <span className="portal-chip-capsule">
        <span>Target:</span>
        <strong>{PORTAL_LABEL.PLATFORM}</strong>
      </span>
    );
  } else if (isPatient) {
    portalChip = (
      <span className="portal-chip-capsule">
        <span>Target:</span>
        <strong>{PORTAL_LABEL.Patient}</strong>
        {multiOrgs ? ' · Multiple hospital records found' : ''}
      </span>
    );
  } else {
    portalChip = (
      <span className="portal-chip-capsule">
        <span>Target:</span>
        <strong>{identity.org.name}</strong> · {PORTAL_LABEL[identity.actor]}
      </span>
    );
  }

  return (
    <div className="login-page-root">
      {/* 1. Atmospheric Hospital Background (ECG telemetry + clinical grid) */}
      <HospitalBackground />

      {/* 2. Frosted Topbar Navigation */}
      <header className="login-topbar">
        <div className="login-topbar-content">
          <Link to="/landing/landing-page.html" className="login-brand" title="Back to Home">
            <div className="login-brand-icon">
              <span>+</span>
            </div>
            <div className="login-brand-info">
              <span className="login-brand-name">Federico</span>
              <span className="login-brand-sub">Healthcare Cloud</span>
            </div>
          </Link>

          <div className="login-topbar-badge">
            <ShieldCheck size={14} className="badge-shield-icon" />
            <span>End-to-End Encrypted Access</span>
          </div>
        </div>
      </header>

      {/* 3. Main Stage: Two-column Side-by-Side Apple Layout */}
      <main className="login-main-stage">
        <div className="login-split-container">
          {/* Column A: Sign In Card */}
          <section className="login-card-apple" aria-labelledby="signin-heading">
            <div className="login-card-header">
              <div className="login-eyebrow-pill">
                <span className="live-pulse-dot" />
                <span>Unified Clinical Access</span>
              </div>
              <h1 id="signin-heading" className="login-title">
                Sign in to your portal
              </h1>
              <p className="login-subtitle">
                Access your designated healthcare workspace, patient dashboard, or clinical
                operations suite.
              </p>
            </div>

            <form
              id="login-form"
              className="login-apple-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              {error && (
                <div className="login-error-pill" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="apple-input-group">
                <label htmlFor="email" className="apple-input-label">
                  Email Address
                </label>
                <div className="apple-input-wrapper">
                  <Mail size={18} className="apple-input-icon" />
                  <input
                    id="email"
                    type="email"
                    className="apple-text-input"
                    placeholder="name@hospital.com or patient email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setMultiOrgs(null);
                      setDemoTab(null);
                    }}
                    onBlur={() => setSettledEmail(email)}
                  />
                </div>
                <div className="portal-detector-row" aria-live="polite">
                  {portalChip}
                </div>
              </div>

              {/* Multi-hospital Facility Selector */}
              {multiOrgs && (
                <div className="apple-input-group md-fade-in">
                  <label htmlFor="organization" className="apple-input-label">
                    Select Hospital Facility
                  </label>
                  <div className="apple-input-wrapper">
                    <Building2 size={18} className="apple-input-icon" />
                    <select
                      id="organization"
                      className="apple-select-input"
                      value={orgId}
                      onChange={(e) => {
                        setOrgId(e.target.value);
                        setOrgTouched(true);
                      }}
                    >
                      {multiOrgs.map((org) => (
                        <option key={org.organization_id} value={String(org.organization_id)}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="apple-input-hint">
                    This account is active across multiple medical facilities. Choose your session target.
                  </span>
                </div>
              )}

              {/* Password Input */}
              <div className="apple-input-group">
                <div className="password-label-row">
                  <label htmlFor="password" className="apple-input-label">
                    Password
                  </label>
                  <button
                    type="button"
                    className="forgot-link-btn"
                    onClick={() =>
                      toast(
                        'Please contact your hospital facility IT administration for password resets.',
                        'info',
                      )
                    }
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="apple-input-wrapper">
                  <Lock size={18} className="apple-input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="apple-text-input"
                    placeholder="Enter account password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Workstation Remember Options */}
              <div className="apple-form-options">
                <label className="apple-checkbox-label">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="apple-checkbox"
                  />
                  <span>Remember this workstation</span>
                </label>
              </div>

              {/* Hospital Blood Red Primary Submit Button */}
              <button
                className="btn-hospital-submit"
                type="submit"
                disabled={submitting}
              >
                <span>
                  {submitting
                    ? 'Authenticating…'
                    : multiOrgs
                      ? 'Continue to Hospital'
                      : 'Sign In'}
                </span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="login-card-foot">
              <span>Looking to register as a patient? </span>
              <Link to="/signup/signup-page.html" className="foot-link">
                Register here
              </Link>
            </div>
          </section>

          {/* Column B: Demo Credentials Side Panel */}
          <aside className="demo-side-panel" aria-labelledby="demo-heading">
            <div className="demo-panel-header">
              <div className="demo-header-top">
                <div className="demo-pill-badge">
                  <Sparkles size={13} />
                  <span>Developer Sandbox</span>
                </div>
                <span className="demo-header-hint">Instant 1-Click Fill</span>
              </div>
              <h2 id="demo-heading" className="demo-title">
                Demo Directory
              </h2>
              <p className="demo-desc">
                Select a tenant or platform tier to inspect and test role-based clinical permissions.
              </p>
            </div>

            {/* Apple Segmented Capsule Switcher */}
            <div className="demo-segmented-tabs" role="tablist">
              {demoOrgTabs.map((org) => (
                <button
                  key={org.organization_id}
                  type="button"
                  role="tab"
                  aria-selected={activeDemoTab === String(org.organization_id)}
                  className={`demo-tab-btn ${
                    activeDemoTab === String(org.organization_id) ? 'active' : ''
                  }`}
                  onClick={() => setDemoTab(String(org.organization_id))}
                >
                  {org.name}
                </button>
              ))}
              <button
                type="button"
                role="tab"
                aria-selected={activeDemoTab === PLATFORM_DEMO_TAB}
                className={`demo-tab-btn ${
                  activeDemoTab === PLATFORM_DEMO_TAB ? 'active' : ''
                }`}
                onClick={() => setDemoTab(PLATFORM_DEMO_TAB)}
              >
                Platform
              </button>
            </div>

            {/* Scrollable Demo Accounts List */}
            <div className="demo-accounts-scroll">
              {demoRows.map(({ role, account }) => (
                <div
                  key={account.email}
                  className="demo-account-card"
                  onClick={() => fillDemo(account, activeDemoTab)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      fillDemo(account, activeDemoTab);
                    }
                  }}
                  title="Click to autofill credentials"
                >
                  <div className="account-card-top">
                    <div className="account-title-wrap">
                      <span className={`role-badge role-${role.toLowerCase()}`}>
                        {role}
                      </span>
                      <span className="account-name">{account.displayName}</span>
                    </div>
                    <span className="autofill-action-pill">
                      <span>Autofill</span>
                    </span>
                  </div>

                  {account.purpose && (
                    <p className="account-purpose">{account.purpose}</p>
                  )}

                  <div className="account-creds-strip">
                    <span className="account-email">{account.email}</span>
                    <span className="account-pwd-pill">
                      <Lock size={12} style={{ color: '#00897B', flexShrink: 0 }} />
                      <code>{account.password}</code>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="demo-panel-footer">
              <Info size={13} style={{ flexShrink: 0 }} />
              <span>Clicking any card automatically populates the sign-in form.</span>
            </div>
          </aside>
        </div>
      </main>

      {/* 4. Minimalist Plain Single-Line Footer */}
      <footer className="login-footer-apple">
        <p className="login-footer-text">
          © 2026 Federico Cloud Platform. Built with care for hospitals &amp; patients worldwide.
        </p>
      </footer>
    </div>
  );
}
