'use strict';

import React from 'react';
import { HeartHandshake, Timer, Network, Check, X } from 'lucide-react';

/**
 * AboutProjectSection
 * 
 * Tells the human story and operational mission of the Federico Cloud platform.
 * Contrasts archaic paper bureaucracy against modern, patient-first digital architecture.
 */
export default function AboutProjectSection() {
  return (
    <section id="about" className="about-project-section">
      <div className="section-header-centered">
        <span className="section-pill-tag">About Our Project</span>
        <h2 className="section-heading">
          Why Federico? <br />
          <span>Because administrative latency costs human lives.</span>
        </h2>
        <p className="section-subtext">
          In hospitals around the world, patients in acute distress wait at reception desks 
          while staff manually fill physical clipboards. Federico was built by engineers and healthcare 
          designers to return that stolen time to clinical care.
        </p>
      </div>

      {/* The Dilemma & The Solution Side-by-Side Comparison */}
      <div className="about-comparison-grid">
        {/* Legacy Way */}
        <div className="comparison-card legacy-card">
          <div className="comparison-badge red">The Archaic System</div>
          <h3 className="comparison-title">Paper Bureaucracy &amp; Departmental Silos</h3>
          <ul className="comparison-list">
            <li>
              <span className="bullet-cross-wrap">
                <X size={13} strokeWidth={3} />
              </span>
              <span><strong>40+ Minute Admission Delay:</strong> Patients wait for physical files to travel between intake, wards, and nurses.</span>
            </li>
            <li>
              <span className="bullet-cross-wrap">
                <X size={13} strokeWidth={3} />
              </span>
              <span><strong>Phantom Bed Shortages:</strong> Clean, available beds sit empty because ward status updates rely on manual phone calls.</span>
            </li>
            <li>
              <span className="bullet-cross-wrap">
                <X size={13} strokeWidth={3} />
              </span>
              <span><strong>Surprise Billing Shock:</strong> Families face unexpected medical fees at discharge due to un-audited paper chits.</span>
            </li>
            <li>
              <span className="bullet-cross-wrap">
                <X size={13} strokeWidth={3} />
              </span>
              <span><strong>Clerical Exhaustion:</strong> Skilled administrative and nursing staff spend 35% of their shift handwriting duplicate logs.</span>
            </li>
          </ul>
        </div>

        {/* The Federico Cloud Standard */}
        <div className="comparison-card modern-card">
          <div className="comparison-badge green">The Federico Standard</div>
          <h3 className="comparison-title">Synchronized, Real-Time Healthcare Cloud</h3>
          <ul className="comparison-list">
            <li>
              <span className="bullet-check-wrap">
                <Check size={13} strokeWidth={3} />
              </span>
              <span><strong>&lt; 30-Second Intake Cascade:</strong> Emergency pre-registration allocates bed, doctor, and UHID before ambulance wheels stop.</span>
            </li>
            <li>
              <span className="bullet-check-wrap">
                <Check size={13} strokeWidth={3} />
              </span>
              <span><strong>Dynamic Bed Matrix:</strong> Real-time ward occupancy, automatic sanitization alerts, and zero phantom vacancies.</span>
            </li>
            <li>
              <span className="bullet-check-wrap">
                <Check size={13} strokeWidth={3} />
              </span>
              <span><strong>100% Itemized Transparency:</strong> Digital ledgers with dual-step finance verification and real-time insurance copay splits.</span>
            </li>
            <li>
              <span className="bullet-check-wrap">
                <Check size={13} strokeWidth={3} />
              </span>
              <span><strong>Zero Paper Friction:</strong> Every department (Admin, HOM, PRE, FA, Patients) communicates through one unified memory store.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Human Impact Value Cards */}
      <div className="about-values-grid">
        <div className="value-item-card">
          <div className="value-icon-box purple">
            <Timer size={24} />
          </div>
          <h4 className="value-title">Time is Survival</h4>
          <p className="value-desc">
            Administrative intake speed directly dictates trauma recovery windows. Our 1-click admission cascade eliminates clipboard paperwork.
          </p>
        </div>

        <div className="value-item-card">
          <div className="value-icon-box teal">
            <HeartHandshake size={24} />
          </div>
          <h4 className="value-title">Dignity in Billing</h4>
          <p className="value-desc">
            Medical emergencies should never be compounded by financial ambiguity. Patients and insurance adjusters review itemized ledger updates in real time.
          </p>
        </div>

        <div className="value-item-card">
          <div className="value-icon-box amber">
            <Network size={24} />
          </div>
          <h4 className="value-title">Multi-Branch Telemetry</h4>
          <p className="value-desc">
            Hospital networks manage multiple physical facilities under unified dynamic RBAC, with seamless cross-branch patient transfers and centralized inventory.
          </p>
        </div>
      </div>
    </section>
  );
}
