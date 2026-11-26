'use strict';

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  UserPlus, 
  Building2, 
  ChevronDown
} from 'lucide-react';

/**
 * HeroSection
 * 
 * Apple-grade hero section combining bold typography, refined glassmorphic cards,
 * and clear action hierarchy.
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
          onClick={() => navigate('/signup')}
        >
          <UserPlus size={18} />
          <span>Patient Registration</span>
          <ArrowRight size={16} className="btn-arrow" />
        </button>

        <button
          id="org-signup-btn"
          type="button"
          className="hero-btn-secondary"
          onClick={() => navigate('/org-signup')}
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
    </section>
  );
}
