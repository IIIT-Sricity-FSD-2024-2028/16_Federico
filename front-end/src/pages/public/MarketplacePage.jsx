'use strict';

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { toast } from '../../components/feedback/feedback.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import marketplacePageCss from '../../styles/marketplace/marketplace-page.css?inline';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

/**
 * Ported from marketplace/marketplace-page.html + marketplace-page.js.
 *
 * The legacy page cloned a <template id="org-card-template"> per organization;
 * that becomes a mapped component. Search matches name, specialties and branch
 * "name city" text, and the emergency checkbox filters on emergency_available -
 * all as before.
 */
function matchesSearch(org, query) {
  if (!query) return true;
  const haystack = [
    org.name,
    org.specialties?.join(' '),
    org.branches?.map((b) => b.name + ' ' + (b.city || '')).join(' '),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/**
 * Branch summary text. One branch shows its city (or name); several show the
 * count plus each branch name with the organization prefix stripped, which is
 * why "City General - Main Campus" renders as "Main Campus".
 */
function branchSummary(org) {
  const branches = org.branches || [];
  if (!branches.length) return 'No branches listed';
  if (branches.length === 1) return branches[0].city || branches[0].name;
  const names = branches.map((b) =>
    b.name.replace(org.name + ' — ', '').replace(org.name, 'Main Campus'),
  );
  return branches.length + ' branches — ' + names.join(', ');
}

function OrgCard({ org }) {
  const contactParts = [org.contact?.phone, org.contact?.email].filter(Boolean);

  return (
    <article className="md-card org-card">
      <div className="org-card-head">
        <span
          className="org-mark"
          style={{ background: (org.branding && org.branding.primary_color) || 'var(--md-primary)' }}
        >
          {(org.branding && org.branding.initial) || org.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h3 className="org-name">{org.name}</h3>
          <p className="org-branches">{branchSummary(org)}</p>
        </div>
        {org.emergency_available ? (
          <span className="md-chip emergency-chip">24{'×'}7 Emergency</span>
        ) : null}
      </div>

      <div className="org-specialties">
        {(org.specialties || []).map((s) => (
          <span key={s} className="md-chip md-chip-neutral">
            {s}
          </span>
        ))}
      </div>

      <p className="org-contact">
        {contactParts.join(' · ') || 'Contact details unavailable'}
      </p>

      <div className="org-actions">
        <Link
          className="md-btn md-btn-outlined org-login-link"
          to={'/login/login-page.html?org=' + encodeURIComponent(org.organization_id)}
        >
          Login
        </Link>
        <Link
          className="md-btn md-btn-filled org-register-link"
          to={'/signup/signup-page.html?org=' + encodeURIComponent(org.organization_id)}
        >
          Register as Patient
        </Link>
      </div>
    </article>
  );
}

export default function MarketplacePage() {
  usePageStyles(marketplacePageCss);
  useDocumentTitle('Federico — Find a Hospital');
  const [query, setQuery] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  const { data, error, loading } = useApi(async () => {
    try {
      return await api.marketplace.organizations();
    } catch (err) {
      toast('Could not reach the Federico platform. Please refresh.', 'error');
      throw err;
    }
  }, []);

  // Keyed on `data` (stable between loads); a `data || []` local would be a
  // fresh [] on every render until the first load lands.
  const filtered = useMemo(
    () =>
      (data || []).filter((org) => {
        if (emergencyOnly && !org.emergency_available) return false;
        return matchesSearch(org, query.trim());
      }),
    [data, query, emergencyOnly],
  );

  return (
    <>
      <header className="md-topbar">
        <Link className="md-brand" to="/landing/landing-page.html" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="md-brand-mark">F</span>
          <span>Federico</span>
        </Link>
        <div className="topbar-actions">
          <Link className="md-btn md-btn-text" to="/landing/landing-page.html">
            Home
          </Link>
          <Link className="md-btn md-btn-outlined" to="/login/login-page.html">
            Login
          </Link>
          <Link
            className="md-btn md-btn-filled"
            to="/signup/org-signup.html"
            style={{ background: '#2e7d32', textDecoration: 'none' }}
          >
            Onboard Hospital Chain
          </Link>
        </div>
      </header>

      <main className="md-container marketplace-page">
        <section className="marketplace-hero">
          <div
            className="md-blur-shape md-blur-primary"
            style={{ width: 420, height: 420, top: -140, right: -120 }}
            aria-hidden="true"
          />
          <span className="label">Federico Organization Marketplace</span>
          <h1>Find your hospital on Federico</h1>
          <p className="marketplace-lead">
            Browse participating hospital organizations across India. Search by hospital name, city
            branch, specialty, or 24x7 emergency service {'—'} and seamlessly open that
            hospital&apos;s patient registration and booking gateway.
          </p>

          <div className="marketplace-search">
            <input
              type="search"
              id="search-input"
              placeholder="Search by hospital name, city, or specialty&hellip;"
              aria-label="Search organizations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="emergency-filter">
              <input
                type="checkbox"
                id="emergency-filter"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
              />
              <span>24{'×'}7 Emergency only</span>
            </label>
          </div>
        </section>

        <section id="org-grid" className="org-grid" aria-live="polite">
          {loading ? (
            <EmptyState title="Loading hospitals…" />
          ) : error ? (
            <EmptyState
              title="Could not load hospitals"
              message="Is the backend running? Refresh to retry."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No hospitals match your search"
              message="Try a different name, city, or specialty."
            />
          ) : (
            filtered.map((org) => <OrgCard key={org.organization_id} org={org} />)
          )}
        </section>
      </main>
    </>
  );
}

