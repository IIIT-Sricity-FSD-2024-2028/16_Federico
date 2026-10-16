'use strict';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
// How long the email must sit still before the portal chip reacts.
const IDENTITY_SETTLE_MS = 350;
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
 * The unified sign-in page for every actor.
 *
 *   name.hom@citygen.com         → HOM portal of the hospital that owns citygen.com
 *   name.pre / .fa / .admin@...  → that portal, same domain rule
 *   name.platform@federico.com   → Platform Super User console
 *   personal email               → Patient portal; automatic direct entry, or
 *                                  hospital selector only if registered across multiple facilities
 */
export default function LoginPage() {
  usePageStyles(loginPageCss);
  useDocumentTitle('Federico — Sign In');
  const navigate = useNavigate();
  const { authenticate, getLastAuthError, isPlatformUser } = useSession();
  const preselectOrg = useSearchParam('org');

  // Remembered credentials seed the initial state directly.
  const [remembered] = useState(readRemembered);
  const [organizations, setOrganizations] = useState(null); // null = loading
  const [demoData, setDemoData] = useState(null);
  const [orgId, setOrgId] = useState('');
  const [orgTouched, setOrgTouched] = useState(false);
  const [multiOrgs, setMultiOrgs] = useState(null); // null = direct login; array = multi-hospital selection mode
  const [email, setEmail] = useState(remembered?.email || '');
  const [settledEmail, setSettledEmail] = useState(remembered?.email || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(Boolean(remembered));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoTab, setDemoTab] = useState(null);

  // Already signed in as platform? Skip straight to the console.
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
        purpose: 'Platform Super User — Tenant hospital provisioning, subscription management, and MRR analytics',
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
      setError('Enter both email and password.');
      return;
    }
    if (organizations === null) {
      setError('Still loading, please try again in a moment.');
      return;
    }

    const target = resolveLoginIdentity(trimmedEmail, organizations);
    if (!target) {
      setError('Enter a valid email address.');
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
        /* storage unavailable; login still succeeded */
      }

      navigate(getActorHome(authResult.actor));
    } catch (err) {
      setError(err?.status === 0 ? err.message : 'Something went wrong. Please try again.');
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
    toast('Demo credentials copied to form', 'info');
  }

  let portalChip;
  if (!identity) {
    portalChip = (
      <span className="portal-chip portal-chip-idle">
        Staff: name.role@your-hospital domain · Patients: your personal email
      </span>
    );
  } else if (identity.actor === 'PLATFORM') {
    portalChip = (
      <span className="portal-chip">
        Signing in to <strong>{PORTAL_LABEL.PLATFORM}</strong>
      </span>
    );
  } else if (isPatient) {
    portalChip = (
      <span className="portal-chip">
        Signing in to <strong>{PORTAL_LABEL.Patient}</strong>
        {multiOrgs ? ' · Multiple hospital records found' : ''}
      </span>
    );
  } else {
    portalChip = (
      <span className="portal-chip">
        Signing in to <strong>{identity.org.name}</strong> · {PORTAL_LABEL[identity.actor]}
      </span>
    );
  }

  return (
    <>
      <header className="topbar">
        <Link to="/landing/landing-page.html" className="brand" title="Back to Home">
          <div className="brand-icon">F</div>
          <div className="brand-name">Federico Cloud</div>
        </Link>
      </header>

      <main className="login-wrapper">
        <div
          className="md-blur-shape md-blur-primary"
          style={{ width: 420, height: 420, top: -120, left: -160 }}
          aria-hidden="true"
        />
        <div
          className="md-blur-shape md-blur-tertiary"
          style={{ width: 340, height: 340, bottom: -100, right: -140 }}
          aria-hidden="true"
        />

        <section className="login-card">
          <div className="card-head">
            <h1 className="card-title">Sign In</h1>
            <p className="card-subtitle">One sign-in for patients, hospital staff and platform admins</p>
          </div>

          <form
            id="login-form"
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div id="login-error" className="login-error" aria-live="polite">
              {error}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
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
              <div className="portal-chip-row" aria-live="polite">
                {portalChip}
              </div>
            </div>

            {multiOrgs && (
              <div className="form-group md-fade-in">
                <label htmlFor="organization">Select Hospital Facility</label>
                <select
                  id="organization"
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
                <span className="field-hint">
                  This email is registered with multiple hospitals. Please choose which facility you want to access.
                </span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label className="checkbox-wrap">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>
                Forgot Password?
              </a>
            </div>

            <button
              className="login-btn primary-btn login-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : multiOrgs ? 'Continue to Hospital' : 'Sign In'}
            </button>
          </form>

          <div className="demo-credential-card">
            <div className="demo-credential-title">Demo Access</div>
            <div className="demo-credential-copy">
              Click any account below to autofill demo credentials:
            </div>
            <div className="demo-tabs" role="tablist">
              {demoOrgTabs.map((org) => (
                <button
                  key={org.organization_id}
                  type="button"
                  role="tab"
                  aria-selected={activeDemoTab === String(org.organization_id)}
                  className={'demo-tab' + (activeDemoTab === String(org.organization_id) ? ' active' : '')}
                  onClick={() => setDemoTab(String(org.organization_id))}
                >
                  {org.name}
                </button>
              ))}
              <button
                type="button"
                role="tab"
                aria-selected={activeDemoTab === PLATFORM_DEMO_TAB}
                className={'demo-tab' + (activeDemoTab === PLATFORM_DEMO_TAB ? ' active' : '')}
                onClick={() => setDemoTab(PLATFORM_DEMO_TAB)}
              >
                Platform
              </button>
            </div>
            <div id="login-credential-helper" className="demo-credential-list md-fade-switch">
              {demoRows.map(({ role, account }) => (
                <div
                  key={account.email}
                  className="demo-credential-row"
                  style={{ cursor: 'pointer' }}
                  title="Click to fill credentials"
                  onClick={() => fillDemo(account, activeDemoTab)}
                >
                  <div className="demo-row-head">
                    <strong>
                      <span className="demo-role-badge">{role}</span> {account.displayName}
                    </strong>
                  </div>
                  {account.purpose && (
                    <div className="demo-role-desc">{account.purpose}</div>
                  )}
                  <div className="demo-row-creds">
                    <span>{account.email}</span>
                    <code>{account.password}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
