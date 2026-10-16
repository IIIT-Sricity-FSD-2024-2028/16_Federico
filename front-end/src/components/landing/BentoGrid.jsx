'use strict';

import React from 'react';
import { BedDouble, ShieldCheck, Cpu } from 'lucide-react';

/**
 * BentoGrid (Simplified Architecture Section)
 * 
 * Clean, minimalist 3-pillar architecture showcase:
 * 1. Real-Time Ward Telemetry & Automated Cascades
 * 2. Multi-Tenant Dynamic RBAC & Domain Isolation
 * 3. Crash-Safe 12-Factor In-Memory Core
 */
export default function BentoGrid() {
  const pillars = [
    {
      id: 'bed-sync',
      icon: <BedDouble size={26} className="pillar-icon purple" />,
      tag: 'Hospital Operations',
      title: 'Real-Time Bed Telemetry',
      desc: 'Instant synchronization across ICU, Emergency, and General wards. Discharges automatically trigger sanitization cascades, eliminating phantom bed vacancies and administrative wait times.',
      highlight: 'Sub-30s triage-to-bed allocation'
    },
    {
      id: 'rbac',
      icon: <ShieldCheck size={26} className="pillar-icon teal" />,
      tag: 'Enterprise Security',
      title: 'Multi-Tenant Dynamic RBAC',
      desc: 'Complete organizational data isolation bound to verified hospital domains (e.g. citygen.com). Fine-grained dynamic permissions ensure staff only access their designated operational domain.',
      highlight: 'Zero cross-tenant data leakage'
    },
    {
      id: 'core',
      icon: <Cpu size={26} className="pillar-icon amber" />,
      tag: 'High Reliability',
      title: 'Crash-Safe 12-Factor Core',
      desc: 'Sub-5ms in-memory operational performance paired with atomic, debounced disk persistence. Guaranteed state recovery upon system restarts with zero data corruption.',
      highlight: '99.99% operational uptime SLA'
    }
  ];

  return (
    <section id="features" className="architecture-section">
      <div className="section-header-centered">
        <span className="section-pill-tag">System Architecture</span>
        <h2 className="section-heading">
          Engineered for reliability. <br />
          <span>Every layer optimized for critical healthcare.</span>
        </h2>
        <p className="section-subtext">
          A high-throughput, low-latency foundation built to keep hospitals running seamlessly 24&times;7.
        </p>
      </div>

      <div className="architecture-pillars-grid">
        {pillars.map((pillar) => (
          <div key={pillar.id} className="arch-pillar-card">
            <div className="pillar-card-top">
              <div className="pillar-icon-box">{pillar.icon}</div>
              <span className="pillar-tag-badge">{pillar.tag}</span>
            </div>
            <h3 className="pillar-heading">{pillar.title}</h3>
            <p className="pillar-body">{pillar.desc}</p>
            <div className="pillar-footer-highlight">
              <span className="highlight-dot" />
              <span>{pillar.highlight}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
