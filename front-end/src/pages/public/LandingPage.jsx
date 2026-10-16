'use strict';

import { useNavigate } from 'react-router-dom';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import landingPageCss from '../../styles/landing/landing-page.css?inline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

/**
 * Ported from landing/landing-page.html + landing-page.js.
 *
 * The legacy page also loaded rbac.js and api-client.js and used neither; those
 * are dropped. Every button did `window.location.href = ...` and now navigates
 * through the router - same destinations (DEC-1).
 */
export default function LandingPage() {
  usePageStyles(landingPageCss);
  useDocumentTitle('Federico Landing Page');
  const navigate = useNavigate();

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">F</div>
          <div className="brand-text">Federico Cloud</div>
        </div>
      </header>

      <main className="page">
        <section className="hero-section">
          <div className="md-blur-shape md-blur-primary" aria-hidden="true" />
          <div className="md-blur-shape md-blur-tertiary" aria-hidden="true" />

          <div className="hero-card">
            <h1>
              Hospital Administrative Operations, <span>all in one cloud</span>
            </h1>

            <p>
              Federico streamlines patient appointments, bed allocation, inventory logistics, and
              dynamic billing for hospital chains, while connecting patients directly to care.
            </p>

            <div className="hero-actions">
              <button
                id="login-btn"
                className="primary-btn"
                type="button"
                onClick={() => navigate('/login/login-page.html')}
              >
                Login to Portal
              </button>
              <button
                id="signup-btn"
                className="primary-btn"
                type="button"
                onClick={() => navigate('/signup/signup-page.html')}
              >
                Patient Registration
              </button>
              <button
                id="org-signup-btn"
                className="primary-btn"
                type="button"
                onClick={() => navigate('/signup/org-signup.html')}
              >
                Hospital Onboarding
              </button>
              <button
                id="marketplace-btn"
                className="primary-btn"
                type="button"
                onClick={() => navigate('/marketplace/marketplace-page.html')}
              >
                Browse Hospitals
              </button>
            </div>
          </div>

          <div className="side-panels">
            <article className="info-card emergency-card">
              <h2>Emergency Help</h2>
              <p>
                For urgent support, tap the button below to connect with emergency medical services
                immediately.
              </p>
              <button className="call-btn" type="button">
                Call 112
              </button>
            </article>

            <article className="info-card platform-highlights-card">
              <h2>Platform Highlights</h2>
              <ul className="highlights-list">
                <li>
                  <span className="highlight-bullet">{'✓'}</span>
                  <span>
                    <strong>24{'×'}7 Network Operations</strong> {'—'} Unified multi-branch
                    administrative control.
                  </span>
                </li>
                <li>
                  <span className="highlight-bullet">{'✓'}</span>
                  <span>
                    <strong>Real-Time Bed Allocation</strong> {'—'} Dynamic status tracking from
                    admission to discharge.
                  </span>
                </li>
                <li>
                  <span className="highlight-bullet">{'✓'}</span>
                  <span>
                    <strong>Integrated Billing</strong> {'—'} Automated room charges, ledger
                    updates, and receipts.
                  </span>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section className="why-section">
          <span className="section-badge">Why Federico</span>

          <h2>
            Software, not <span>hard paper</span>
          </h2>

          <p className="section-text">
            We replaced slow paper-based processes with smart digital systems {'—'} making
            registration, appointments, staff coordination, and billing faster, cleaner, and easier
            for everyone.
          </p>

          <div className="features-grid">
            <article className="feature-card">
              <h3>Faster Patient Flow</h3>
              <p>
                Digital registration and check-in reduces wait times. Patients move through
                appointments and billing without manual form filling or delays.
              </p>
            </article>

            <article className="feature-card">
              <h3>Better Coordination</h3>
              <p>
                Doctors, PREs, operations, and finance teams all work from one system {'—'}
                updates happen instantly across departments.
              </p>
            </article>

            <article className="feature-card">
              <h3>Zero Paperwork</h3>
              <p>
                Records, bills, and inventory are managed digitally {'—'} cleaner, more accurate,
                and accessible at any time from any branch.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>{'©'} 2026 Federico Cloud Platform</span>
      </footer>
    </>
  );
}

