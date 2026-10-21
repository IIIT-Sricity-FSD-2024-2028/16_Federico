'use strict';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../../api/index.js';
import { useSession } from '../../auth/useSession.js';
import { useSearchParam } from '../../hooks/useSearchParam.js';
import { resolveLoginIdentity, PORTAL_LABEL } from '../../lib/emailIdentity.js';
import { getActorHome } from '../../auth/actorHome.js';
import { toast } from '../../components/feedback/feedback.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import loginPageCss from '../../styles/login/login-page.css?inline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

const REMEMBER_KEY = 'FedericoRememberMe';
const IDENTITY_SETTLE_MS = 250;
const DEMO_ROLE_ORDER = ['Admin', 'HOM', 'PRE', 'FA', 'Patient'];
const PLATFORM_DEMO_TAB = 'platform';

function readRemembered() {
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Minimal, readable login page for healthcare staff and patients.
 * Clean two-column layout with 1-click demo accounts directory.
 */
export default function LoginPage() {
  usePageStyles(loginPageCss);
  useDocumentTitle('Sign In — Federico');
  const navigate = useNavigate();
  const { authenticate, getLastAuthError, isPlatformUser } = useSession();
  const preselectOrg = useSearchParam('org');

  const [remembered] = useState(readRemembered);
  const [organizations, setOrganizations] = useState(null);
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

  useEffect(() => {
    if (isPlatformUser) navigate(getActorHome('PLATFORM'), { replace: true });
  }, [isPlatformUser, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setSettledEmail(email), IDENTITY_SETTLE_MS);
    return () => clearTimeout(t);
  }, [email]);

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
        displayName: 'Platform Admin',
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
      setError('Please enter your email and password.');
      return;
    }
    if (organizations === null) {
      setError('Connecting to service. Please retry in a moment.');
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
        setError(getLastAuthError() || 'Invalid email or password.');
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
        /* storage unavailable */
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
    toast(`Filled credentials for ${account.displayName}`, 'info');
  }

  let portalChip = null;
  if (identity) {
    if (identity.actor === 'PLATFORM') {
      portalChip = <span className="portal-chip platform">Platform</span>;
    } else if (identity.actor === 'Patient') {
      portalChip = (
        <span className="portal-chip patient">
          Patient{multiOrgs ? ' · Multiple Hospitals' : ''}
        </span>
      );
    } else {
      portalChip = (
        <span className="portal-chip staff">
          {identity.org.name} · {PORTAL_LABEL[identity.actor] || identity.actor}
        </span>
      );
    }
  }

  return (
    <div className="login-root">
      {/* Top Header */}
      <header className="login-header">
        <div className="login-header-inner">
          <Link to="/landing/landing-page.html" className="landing-brand" title="Back to Home">
            <div className="brand-emblem">
              <span className="brand-letter">F</span>
            </div>
            <div className="brand-info">
              <span className="brand-name">Federico</span>
              <span className="brand-tagline">Clinical Cloud</span>
            </div>
          </Link>
          <Link to="/landing/landing-page.html" className="header-back-link">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="login-main">
        <div className="login-container">
          {/* Left Column: Sign In Form */}
          <section className="login-box" aria-labelledby="signin-heading">
            <div className="login-box-header">
              <h1 id="signin-heading" className="login-title">
                Sign In
              </h1>
              <p className="login-subtitle">
                Access your healthcare workspace or patient portal.
              </p>
            </div>

            <form
              id="login-form"
              className="login-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  {portalChip}
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="name@hospital.com or patient email"
                  autoComplete="username"
                  spellCheck="false"
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

              {/* Multi-hospital selection if account belongs to multiple orgs */}
              {multiOrgs && (
                <div className="form-group">
                  <label htmlFor="organization" className="form-label">
                    Hospital Facility
                  </label>
                  <select
                    id="organization"
                    name="organization"
                    className="form-select"
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
              )}

              {/* Password */}
              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <button
                    type="button"
                    className="forgot-btn"
                    onClick={() =>
                      toast(
                        'Please contact your hospital facility IT administration for password resets.',
                        'info',
                      )
                    }
                  >
                    Forgot?
                  </button>
                </div>
                <div className="password-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input password-input"
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pwd-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* Submit */}
              <button
                className="btn-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Signing in…'
                  : multiOrgs
                    ? 'Continue to Hospital'
                    : 'Sign In'}
              </button>
            </form>

            <div className="login-box-footer">
              <span>New patient? </span>
              <Link to="/signup/signup-page.html" className="footer-link">
                Register here
              </Link>
            </div>
          </section>

          {/* Right Column: Demo Accounts Directory */}
          <aside className="demo-box" aria-labelledby="demo-heading">
            <div className="demo-box-header">
              <h2 id="demo-heading" className="demo-title">
                Demo Accounts
              </h2>
              <p className="demo-subtitle">
                Select an account to autofill credentials.
              </p>
            </div>

            {/* Tenant Tabs */}
            <div className="demo-tabs" role="tablist">
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

            {/* Accounts List */}
            <div className="demo-list">
              {demoRows.map(({ role, account }) => (
                <button
                  key={account.email}
                  type="button"
                  className="demo-card"
                  onClick={() => fillDemo(account, activeDemoTab)}
                  title={`Click to fill credentials for ${account.displayName}`}
                >
                  <div className="demo-card-top">
                    <span className="role-badge">{role}</span>
                    <span className="demo-name">{account.displayName}</span>
                  </div>
                  <div className="demo-card-bottom">
                    <span className="demo-email">{account.email}</span>
                    <span className="demo-pwd">{account.password}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="login-footer">
        <p>© 2026 Federico Cloud Platform</p>
      </footer>
    </div>
  );
}
