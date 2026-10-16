'use strict';

import React from 'react';
import { usePageStyles } from '../../hooks/usePageStyles.js';
import landingPageCss from '../../styles/landing/landing-page.css?inline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

import HospitalBackground from '../../components/landing/HospitalBackground.jsx';
import LandingNavbar from '../../components/landing/LandingNavbar.jsx';
import HeroSection from '../../components/landing/HeroSection.jsx';
import AboutProjectSection from '../../components/landing/AboutProjectSection.jsx';
import PatientHealthHub from '../../components/landing/PatientHealthHub.jsx';
import BentoGrid from '../../components/landing/BentoGrid.jsx';
import WorkflowSection from '../../components/landing/WorkflowSection.jsx';
import EmergencyTrustBar from '../../components/landing/EmergencyTrustBar.jsx';
import LandingFooter from '../../components/landing/LandingFooter.jsx';

/**
 * LandingPage
 * 
 * Re-imagined Federico Cloud platform landing page.
 * Merges Apple's refined design aesthetic (luminous glassmorphism, clean architecture cards,
 * ambient hospital lighting, and interactive micro-interactions) with Google SDE3
 * engineering rigor (modular architecture, zero layout shifts, accessibility, and high performance).
 */
export default function LandingPage() {
  usePageStyles(landingPageCss);
  useDocumentTitle('Federico Cloud — Hospital Administrative Operations Platform');

  return (
    <div className="landing-page-root">
      {/* 1. Atmospheric Hospital Background (ECG telemetry + clinical grid) */}
      <HospitalBackground />

      {/* 2. Floating Glassmorphic Top Navigation */}
      <LandingNavbar />

      {/* 3. Main Narrative Content */}
      <main className="landing-main-content">
        <HeroSection />
        <AboutProjectSection />
        <PatientHealthHub />
        <BentoGrid />
        <WorkflowSection />
        <EmergencyTrustBar />
      </main>

      {/* 4. Minimalist Plain Single-Line Footer */}
      <LandingFooter />
    </div>
  );
}
