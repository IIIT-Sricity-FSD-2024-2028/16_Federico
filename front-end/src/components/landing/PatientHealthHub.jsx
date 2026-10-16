'use strict';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Droplet, 
  CalendarCheck2, 
  Moon, 
  AlertTriangle, 
  Stethoscope, 
  PhoneCall, 
  Shield, 
  ArrowRight,
  Sparkles,
  Clock,
  Building2,
  QrCode,
  Zap,
  ShieldCheck,
  Activity
} from 'lucide-react';

/**
 * PatientHealthHub
 * 
 * Apple Health-grade interactive wellness & patient care pavilion:
 * 1. Curated Evidence-Based Preventive Health Cards
 * 2. Apple UI Care Navigator with Native Segmented Controller & Value Tiles
 * 3. Patient Bill Transparency & Rights Pledge
 */
export default function PatientHealthHub() {
  const navigate = useNavigate();
  const [selectedTriage, setSelectedTriage] = useState('opd');

  const healthTips = [
    {
      id: 'cardio',
      icon: <Heart size={22} className="tip-icon red" />,
      tag: 'Cardiovascular Care',
      title: 'Vitals Awareness & Blood Pressure',
      summary: 'Normal adult resting pulse ranges from 60 to 100 BPM. Routine blood pressure checks (target < 120/80 mmHg) detect silent hypertension before cardiac complications arise.',
      metric: '120/80',
      metricUnit: 'Target mmHg'
    },
    {
      id: 'hydration',
      icon: <Droplet size={22} className="tip-icon blue" />,
      tag: 'Metabolic Health',
      title: 'Hydration & Renal Protection',
      summary: 'Consuming 2.5–3 liters of water daily helps maintain kidney filtration rate and vascular volume. Drink water consistently throughout the day, not all at once.',
      metric: '2.5L',
      metricUnit: 'Daily Intake'
    },
    {
      id: 'screening',
      icon: <CalendarCheck2 size={22} className="tip-icon green" />,
      tag: 'Preventive Care',
      title: 'Annual Screening Milestones',
      summary: 'Adults 25+ should schedule annual fasting blood glucose (HbA1c) and lipid profiles. Early detection stops 80% of preventable chronic illnesses.',
      metric: 'Annual',
      metricUnit: 'Checkup Cadence'
    },
    {
      id: 'sleep',
      icon: <Moon size={22} className="tip-icon purple" />,
      tag: 'Immune Recovery',
      title: 'Sleep Architecture & Cellular Repair',
      summary: '7–9 hours of undisturbed sleep allows somatic cellular regeneration and regulates cortisol. Limit blue-light exposure 45 minutes prior to sleep.',
      metric: '7-9h',
      metricUnit: 'Nightly Sleep'
    }
  ];

  return (
    <section id="health-hub" className="patient-health-section">
      {/* Section Header */}
      <div className="section-header-centered">
        <span className="section-pill-tag">Patient Care Pavilion</span>
        <h2 className="section-heading">
          Empowering your health. <br />
          <span>Curated medical guidance, designed for everyone.</span>
        </h2>
        <p className="section-subtext">
          Whether you are managing daily vitality or seeking immediate hospital care, 
          Federico empowers patients with transparent clinical tools and clear guidance.
        </p>
      </div>

      {/* 1. Preventive Wellness Vitals Grid */}
      <div className="health-tips-grid">
        {healthTips.map((tip) => (
          <div key={tip.id} className="health-tip-card">
            <div className="tip-card-header">
              <div className="tip-icon-box">{tip.icon}</div>
              <span className="tip-tag-badge">{tip.tag}</span>
            </div>
            <h3 className="tip-title">{tip.title}</h3>
            <p className="tip-summary">{tip.summary}</p>
            <div className="tip-metric-bar">
              <span className="metric-val">{tip.metric}</span>
              <span className="metric-unit">{tip.metricUnit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Apple UI Interactive Care Navigator */}
      <div className="apple-care-navigator">
        <div className="apple-navigator-header">
          <div className="nav-tag-badge">
            <Sparkles size={14} />
            <span>Care Navigator</span>
          </div>
          <h3 className="apple-navigator-title">Which level of care do you require today?</h3>
          <p className="apple-navigator-desc">Select your symptoms for direct, non-bureaucratic routing to the appropriate hospital team.</p>
        </div>

        {/* Apple Segmented Control */}
        <div className="apple-segmented-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={selectedTriage === 'opd'}
            className={`apple-segment-pill ${selectedTriage === 'opd' ? 'active' : ''}`}
            onClick={() => setSelectedTriage('opd')}
          >
            <Stethoscope size={16} />
            <span>Routine &amp; Specialist</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedTriage === 'urgent'}
            className={`apple-segment-pill ${selectedTriage === 'urgent' ? 'active' : ''}`}
            onClick={() => setSelectedTriage('urgent')}
          >
            <Zap size={16} />
            <span>Same-Day Walk-In</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedTriage === 'emergency'}
            className={`apple-segment-pill emergency-pill ${selectedTriage === 'emergency' ? 'active' : ''}`}
            onClick={() => setSelectedTriage('emergency')}
          >
            <AlertTriangle size={16} />
            <span>Emergency SOS (112)</span>
          </button>
        </div>

        {/* Apple Elevated Care Sheet */}
        <div className="apple-care-sheet">
          {selectedTriage === 'opd' && (
            <div className="apple-sheet-content animate-fade-in">
              <div className="apple-sheet-header">
                <div className="apple-icon-squircle teal">
                  <Stethoscope size={26} />
                </div>
                <div className="apple-sheet-meta">
                  <span className="apple-category-eyebrow">Outpatient Department • Specialist Consultations</span>
                  <h4 className="apple-sheet-heading">Confirmed specialist consultations without reception latency</h4>
                  <p className="apple-sheet-summary">
                    Pre-register online to bypass reception clipboards. Receive an encrypted digital queue token and proceed directly to your specialist room.
                  </p>
                </div>
              </div>

              {/* 3 Apple Value Tiles */}
              <div className="apple-feature-tiles-grid">
                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap">
                    <Clock size={18} />
                  </div>
                  <h5 className="tile-title">15-Min Token Alert</h5>
                  <p className="tile-desc">Live SMS &amp; in-app notification when your doctor's consultation bay is sanitized and ready.</p>
                </div>

                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap">
                    <Building2 size={18} />
                  </div>
                  <h5 className="tile-title">38 Clinical Specialties</h5>
                  <p className="tile-desc">Direct scheduling with verified doctors across Cardiology, Neurology, Pediatrics &amp; Oncology.</p>
                </div>

                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap">
                    <QrCode size={18} />
                  </div>
                  <h5 className="tile-title">Universal Health ID</h5>
                  <p className="tile-desc">Instant digital record synchronization across all affiliated hospital network facilities.</p>
                </div>
              </div>

              {/* Apple Action Cluster */}
              <div className="apple-sheet-footer">
                <div className="apple-action-buttons">
                  <button
                    type="button"
                    className="hero-btn-primary"
                    onClick={() => navigate('/signup/signup-page.html')}
                  >
                    <span>Register &amp; Book Appointment</span>
                    <ArrowRight size={16} className="btn-arrow" />
                  </button>
                  <button
                    type="button"
                    className="hero-btn-secondary"
                    onClick={() => navigate('/marketplace/marketplace-page.html')}
                  >
                    <span>Browse Hospital Specialists</span>
                  </button>
                </div>
                <span className="apple-security-note">Encrypted HIPAA &amp; GDPR Non-Clinical Architecture</span>
              </div>
            </div>
          )}

          {selectedTriage === 'urgent' && (
            <div className="apple-sheet-content animate-fade-in">
              <div className="apple-sheet-header">
                <div className="apple-icon-squircle amber">
                  <Zap size={26} />
                </div>
                <div className="apple-sheet-meta">
                  <span className="apple-category-eyebrow">Priority Walk-In Clinic • Same-Day Attention</span>
                  <h4 className="apple-sheet-heading">Express walk-in triage with instant Universal Health ID</h4>
                  <p className="apple-sheet-summary">
                    For acute fever, sprains, minor trauma, or sudden discomfort. Pre-register your digital pass to enter the priority intake cascade immediately.
                  </p>
                </div>
              </div>

              {/* 3 Apple Value Tiles */}
              <div className="apple-feature-tiles-grid">
                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap">
                    <Zap size={18} />
                  </div>
                  <h5 className="tile-title">&lt; 30s Intake Scan</h5>
                  <p className="tile-desc">The PRE desk scans your QR pass and assigns emergency priority without manual paper forms.</p>
                </div>

                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap">
                    <Stethoscope size={18} />
                  </div>
                  <h5 className="tile-title">Dynamic Bay Routing</h5>
                  <p className="tile-desc">Federico automatically matches ready consultation bays and on-duty physicians in real time.</p>
                </div>

                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap">
                    <ShieldCheck size={18} />
                  </div>
                  <h5 className="tile-title">Transparent Ledger</h5>
                  <p className="tile-desc">Upfront insurance copay estimates and itemized charges verified prior to clinical intake.</p>
                </div>
              </div>

              {/* Apple Action Cluster */}
              <div className="apple-sheet-footer">
                <div className="apple-action-buttons">
                  <button
                    type="button"
                    className="hero-btn-primary"
                    onClick={() => navigate('/signup/signup-page.html')}
                  >
                    <span>Create Express UHID Pass</span>
                    <ArrowRight size={16} className="btn-arrow" />
                  </button>
                  <button
                    type="button"
                    className="hero-btn-secondary"
                    onClick={() => navigate('/login/login-page.html')}
                  >
                    <span>Sign In to Existing Profile</span>
                  </button>
                </div>
                <span className="apple-security-note">Direct Walk-In Priority Queue Active</span>
              </div>
            </div>
          )}

          {selectedTriage === 'emergency' && (
            <div className="apple-sheet-content emergency animate-fade-in">
              <div className="apple-sheet-header">
                <div className="apple-icon-squircle red">
                  <PhoneCall size={26} />
                </div>
                <div className="apple-sheet-meta">
                  <span className="apple-category-eyebrow red">Critical Medical Lifeline • Emergency SOS</span>
                  <h4 className="apple-sheet-heading">Direct emergency medical dispatch for acute trauma</h4>
                  <p className="apple-sheet-summary">
                    For severe chest pain, major trauma, stroke symptoms, loss of consciousness, or acute respiratory distress. Connect directly with national dispatch.
                  </p>
                </div>
              </div>

              {/* 3 Apple Value Tiles */}
              <div className="apple-feature-tiles-grid">
                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap red">
                    <PhoneCall size={18} />
                  </div>
                  <h5 className="tile-title">Direct 112 Hotline</h5>
                  <p className="tile-desc">Immediate 24/7 telephone connection to national emergency ambulance dispatch operators.</p>
                </div>

                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap red">
                    <Activity size={18} />
                  </div>
                  <h5 className="tile-title">Pre-Alert Telemetry</h5>
                  <p className="tile-desc">Hospital trauma bay receives pre-arrival telemetry before ambulance wheels stop.</p>
                </div>

                <div className="apple-feature-tile">
                  <div className="tile-icon-wrap red">
                    <Clock size={18} />
                  </div>
                  <h5 className="tile-title">Zero Bureaucracy</h5>
                  <p className="tile-desc">Clinical treatment and stabilization precede all administrative paperwork and payments.</p>
                </div>
              </div>

              {/* Apple Action Cluster */}
              <div className="apple-sheet-footer">
                <div className="apple-action-buttons">
                  <a
                    href="tel:112"
                    className="hero-btn-primary"
                  >
                    <PhoneCall size={18} />
                    <span>Call Emergency Dispatch (112)</span>
                  </a>
                  <button
                    type="button"
                    className="hero-btn-secondary"
                    onClick={() => navigate('/marketplace/marketplace-page.html')}
                  >
                    <span>View Emergency Bay Locations</span>
                  </button>
                </div>
                <span className="apple-security-note red">Direct 24/7 National Emergency Lifeline</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Patient Transparency & Rights Pledge */}
      <div className="patient-rights-banner">
        <div className="rights-headline-group">
          <Shield size={28} className="rights-shield-icon" />
          <div>
            <h3 className="rights-heading">The Federico Patient Bill of Rights</h3>
            <p className="rights-sub">Every patient in our network is protected by three immutable non-clinical commitments.</p>
          </div>
        </div>

        <div className="rights-pillars-grid">
          <div className="right-pillar">
            <span className="pillar-num">01</span>
            <h4 className="pillar-title">Zero Hidden Fees</h4>
            <p className="pillar-text">Every bed tier, consumable, and procedure is itemized before discharge. No surprise aggregate invoices.</p>
          </div>
          <div className="right-pillar">
            <span className="pillar-num">02</span>
            <h4 className="pillar-title">Real-Time Insurance Split</h4>
            <p className="pillar-text">Track insurer approvals and out-of-pocket copay calculations live from your patient portal.</p>
          </div>
          <div className="right-pillar">
            <span className="pillar-num">03</span>
            <h4 className="pillar-title">Portable Universal ID</h4>
            <p className="pillar-text">Your Universal Health ID (UHID) is recognized across all network branches, eliminating redundant medical intake.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
