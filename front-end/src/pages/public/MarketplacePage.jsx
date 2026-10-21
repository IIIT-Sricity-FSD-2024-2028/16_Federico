'use strict';

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  AlertTriangle,
  ArrowRight,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { toast } from '../../components/feedback/feedback.js';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import marketplacePageCss from '../../styles/marketplace/marketplace-page.css?inline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import HospitalBackground from '../../components/landing/HospitalBackground.jsx';

/**
 * Filter organizations based on query matching name, specialties, and branch names / cities.
 */
function matchesSearch(org, query) {
  if (!query) return true;
  const haystack = [
    org.name,
    org.specialties?.join(' '),
    org.branches?.map((b) => `${b.name} ${b.city || ''}`).join(' '),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/**
 * Patient-focused location summary.
 */
function formatPatientLocation(org) {
  const branches = org.branches || [];
  if (!branches.length) return 'Main Campus';
  const cities = [...new Set(branches.map((b) => b.city).filter(Boolean))].join(', ');
  const branchCount = branches.length;
  if (branchCount === 1) {
    return branches[0].city ? `${branches[0].city} · ${branches[0].name}` : branches[0].name;
  }
  return `${cities || 'Multiple Facilities'} (${branchCount} branches)`;
}

/**
 * Clean, patient-centric hospital card.
 */
function OrgCard({ org }) {
  return (
    <article className="hospital-card">
      <div className="hospital-card-header">
        <div className="hospital-title-group">
          <h3 className="hospital-name">{org.name}</h3>
          <p className="hospital-branches">
            <MapPin size={13} className="loc-icon" />
            <span>{formatPatientLocation(org)}</span>
          </p>
        </div>
      </div>

      {org.specialties && org.specialties.length > 0 && (
        <div className="hospital-specialties-wrap">
          {org.specialties.slice(0, 5).map((specialty) => (
            <span key={specialty} className="specialty-chip">
              {specialty}
            </span>
          ))}
        </div>
      )}

      <div className="hospital-actions-row">
        <Link
          className="btn-hospital-primary"
          to={`/signup/signup-page.html?org=${encodeURIComponent(org.organization_id)}`}
        >
          <span>Register as Patient</span>
          <ArrowRight size={14} />
        </Link>
        <Link
          className="btn-hospital-secondary"
          to={`/login/login-page.html?org=${encodeURIComponent(org.organization_id)}`}
        >
          <span>Patient Sign In</span>
        </Link>
      </div>
    </article>
  );
}

export default function MarketplacePage() {
  usePageStyles(marketplacePageCss);
  useDocumentTitle('Federico — Hospital Directory');
  const [query, setQuery] = useState('');

  const { data, error, loading } = useApi(async () => {
    try {
      return await api.marketplace.organizations();
    } catch (err) {
      toast('Could not reach the Federico platform. Please refresh.', 'error');
      throw err;
    }
  }, []);

  const filtered = useMemo(
    () => (data || []).filter((org) => matchesSearch(org, query.trim())),
    [data, query],
  );

  return (
    <div className="marketplace-root">
      {/* 1. Atmospheric Hospital Background */}
      <HospitalBackground showEcg={false} />

      {/* 2. Frosted Glass Top Navigation */}
      <header className="marketplace-topbar">
        <div className="marketplace-topbar-content">
          <Link className="marketplace-brand" to="/landing/landing-page.html">
            <div className="brand-badge-icon">
              <span>F</span>
            </div>
            <span className="brand-name">Federico</span>
          </Link>
        </div>
      </header>

      {/* 3. Main Content Container */}
      <main className="marketplace-main">
        {/* Hero Section */}
        <section className="marketplace-hero">
          <span className="section-pill-tag">Verified Hospital Directory</span>
          <h1 className="marketplace-heading">
            Find certified hospitals &amp; <span>care centers</span>
          </h1>
        </section>

        {/* Search Control Bar */}
        <section className="marketplace-control-bar" aria-label="Search organizations">
          <div className="search-input-wrap">
            <Search size={17} className="search-icon" />
            <input
              type="text"
              id="search-input"
              className="marketplace-search-input"
              placeholder="Search by hospital name, city, or medical specialty…"
              aria-label="Search organizations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setQuery('')}
                aria-label="Clear search text"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </section>

        {/* Results Metadata */}
        {!loading && !error && (
          <div className="results-meta-bar">
            <span className="results-count-text">
              Showing {filtered.length} {filtered.length === 1 ? 'hospital' : 'hospitals'}{' '}
              available
            </span>
          </div>
        )}

        {/* Organizations Grid */}
        <section className="hospital-cards-grid" aria-live="polite">
          {loading ? (
            <div className="marketplace-empty-card">
              <div className="empty-icon-wrap">
                <RefreshCw size={22} className="spinning-icon" />
              </div>
              <h3 className="empty-title">Loading verified hospitals…</h3>
              <p className="empty-desc">
                Connecting to the secure Federico healthcare network registry.
              </p>
            </div>
          ) : error ? (
            <div className="marketplace-empty-card">
              <div className="empty-icon-wrap" style={{ color: '#D80027' }}>
                <AlertTriangle size={22} />
              </div>
              <h3 className="empty-title">Unable to reach hospital directory</h3>
              <p className="empty-desc">
                Please verify network connectivity and ensure the Federico service is active.
              </p>
              <button
                type="button"
                className="btn-hospital-secondary"
                style={{ marginTop: '12px' }}
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={13} />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="marketplace-empty-card">
              <div className="empty-icon-wrap">
                <Search size={22} />
              </div>
              <h3 className="empty-title">No matching hospitals found</h3>
              <p className="empty-desc">
                {`No hospitals matched "${query}". Try searching for cardiology, emergency, or general campus.`}
              </p>
              <button
                type="button"
                className="btn-hospital-secondary"
                style={{ marginTop: '12px' }}
                onClick={() => setQuery('')}
              >
                Clear search
              </button>
            </div>
          ) : (
            filtered.map((org) => <OrgCard key={org.organization_id} org={org} />)
          )}
        </section>
      </main>

      {/* 4. Minimalist Plain Single-Line Footer */}
      <footer className="marketplace-footer">
        <div className="marketplace-footer-container">
          <p className="marketplace-footer-text">
            © 2026 Federico Cloud Platform. Built with care for hospitals &amp; patients worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}
