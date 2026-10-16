'use strict';

import React from 'react';
import { PhoneCall, ShieldCheck, Lock, Activity } from 'lucide-react';

/**
 * EmergencyTrustBar
 * 
 * Provides an immediate emergency SOS contact for patients in acute need
 * alongside enterprise-grade architectural and compliance assurances.
 */
export default function EmergencyTrustBar() {
  return (
    <section className="emergency-trust-section">
      <div className="emergency-trust-grid">
        {/* Urgent Emergency SOS Card */}
        <div className="emergency-sos-card">
          <div className="sos-header-group">
            <div className="sos-icon-badge">
              <PhoneCall size={22} />
            </div>
            <h3 className="sos-heading">Emergency Medical Services</h3>
            <p className="sos-text">
              If you or a loved one is experiencing severe chest pain, major trauma, 
              loss of consciousness, or difficulty breathing, do not wait. Connect directly with emergency dispatch.
            </p>
          </div>

          <div className="sos-action-group">
            <a href="tel:112" className="sos-call-btn">
              <PhoneCall size={18} />
              <span>Call 112 Immediately</span>
            </a>
            <span className="sos-footnote">Direct 24/7 National Emergency Hotline • Toll-Free</span>
          </div>
        </div>

        {/* Enterprise Security & Trust Assurances */}
        <div className="trust-assurances-card">
          <h3 className="trust-heading">Built on Non-Clinical Integrity</h3>
          <p className="trust-sub">Federico is engineered to adhere to strict international healthcare software standards.</p>

          <div className="trust-points-list">
            <div className="trust-point-item">
              <div className="trust-icon-badge green">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="point-title">Strict Non-Clinical Scope</h4>
                <p className="point-desc">
                  Federico strictly manages administrative, ward, and financial logistics. No diagnostic models or prescription decisions are automated.
                </p>
              </div>
            </div>

            <div className="trust-point-item">
              <div className="trust-icon-badge purple">
                <Lock size={18} />
              </div>
              <div>
                <h4 className="point-title">Tenant Data Isolation</h4>
                <p className="point-desc">
                  Every hospital branch operates within strict tenant boundaries. User sessions, patient records, and logs are segregated at the datastore layer.
                </p>
              </div>
            </div>

            <div className="trust-point-item">
              <div className="trust-icon-badge blue">
                <Activity size={18} />
              </div>
              <div>
                <h4 className="point-title">24&times;7 Continuous Network Uptime</h4>
                <p className="point-desc">
                  Designed for mission-critical hospital environments where a single minute of server unavailability can stall triage admissions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
