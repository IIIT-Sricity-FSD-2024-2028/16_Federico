'use strict';

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  UserPlus, 
  Building2, 
  Clock, 
  Layers, 
  ShieldCheck, 
  FileCheck2,
  ChevronDown
} from 'lucide-react';

/**
 * HeroSection
 * 
 * Apple-grade hero section combining bold typography, refined glassmorphic cards,
 * clear action hierarchy, and immediate operational metrics.
 */
export default function HeroSection() {
  const navigate = useNavigate();

  const scrollToAbout = () => {
    const el = document.getElementById('about');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="landing-hero-section">

      {/* Main Headline */}
      <h1 className="hero-main-title">
        Hospital operations, <br className="hero-break" />
        <span className="gradient-highlight">designed for clarity</span>, <br className="hero-break" />
        engineered for life.
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        Eliminate administrative latency, chaos in emergency triage, and opaque medical billing. 
        Federico seamlessly synchronizes real-time bed occupancy, clinical inventory, 
        and patient registration across entire hospital networks.
      </p>

      {/* Primary Action Buttons */}
      <div className="hero-actions-group">
        <button
          id="signup-btn"
          type="button"
          className="hero-btn-primary"
          onClick={() => navigate('/signup/signup-page.html')}
        >
          <UserPlus size={18} />
          <span>Patient Registration</span>
          <ArrowRight size={16} className="btn-arrow" />
        </button>

        <button
          id="org-signup-btn"
          type="button"
          className="hero-btn-secondary"
          onClick={() => navigate('/signup/org-signup.html')}
        >
          <Building2 size={18} />
          <span>Hospital Onboarding</span>
        </button>

        <button
          type="button"
          className="hero-btn-ghost"
          onClick={scrollToAbout}
        >
          <span>Learn About Project</span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Key Real-Time Metrics Strip */}
      <div className="hero-metrics-strip">
        <div className="metric-box">
          <div className="metric-icon-wrap">
            <Clock size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-number">&lt; 30s</span>
            <span className="metric-label">Emergency Bed Cascade</span>
          </div>
        </div>

        <div className="metric-divider" />

        <div className="metric-box">
          <div className="metric-icon-wrap">
            <FileCheck2 size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-number">100%</span>
            <span className="metric-label">Zero-Paperwork Ledger</span>
          </div>
        </div>

        <div className="metric-divider" />

        <div className="metric-box">
          <div className="metric-icon-wrap">
            <Layers size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-number">38</span>
            <span className="metric-label">Canonical Collections</span>
          </div>
        </div>

        <div className="metric-divider" />

        <div className="metric-box">
          <div className="metric-icon-wrap">
            <ShieldCheck size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-number">12-Factor</span>
            <span className="metric-label">Crash-Safe Persistence</span>
          </div>
        </div>
      </div>
    </section>
  );
}
