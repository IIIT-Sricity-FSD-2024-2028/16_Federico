'use strict';

import React from 'react';
import { UserPlus2, BedDouble, Stethoscope, ReceiptText } from 'lucide-react';

/**
 * WorkflowSection
 * 
 * 4-step progressive timeline demonstrating how a patient moves seamlessly 
 * through Federico from pre-intake to final administrative discharge.
 */
export default function WorkflowSection() {
  const steps = [
    {
      num: '01',
      icon: <UserPlus2 size={24} />,
      title: 'Digital Intake & Triage',
      desc: 'Patients pre-register online or arrive as walk-ins. The PRE desk generates a verified Universal Health ID (UHID) and assigns emergency triage priority in seconds.'
    },
    {
      num: '02',
      icon: <BedDouble size={24} />,
      title: 'Dynamic Bed Allocation',
      desc: 'HOM monitors real-time ward telemetry. High-priority patients are instantly assigned to available beds, triggering automatic room preparation cascades.'
    },
    {
      num: '03',
      icon: <Stethoscope size={24} />,
      title: 'Ward Service & Inventory Logs',
      desc: 'Clinical items, specialist visits, and non-clinical consumables are logged directly against the patient visit, updating branch stock in real time.'
    },
    {
      num: '04',
      icon: <ReceiptText size={24} />,
      title: 'Finance Audit & Safe Discharge',
      desc: 'The FA desk verifies charges, reconciles insurance coverage, and generates an itemized bill. Once settled, the bed is immediately released for sanitization.'
    }
  ];

  return (
    <section className="workflow-section">
      <div className="section-header-centered">
        <span className="section-pill-tag">The Care Journey</span>
        <h2 className="section-heading">
          From intake to discharge. <br />
          <span>Synchronized every step of the way.</span>
        </h2>
        <p className="section-subtext">
          Zero missing charts, zero miscommunicated bed statuses, and zero surprise bills.
        </p>
      </div>

      <div className="workflow-timeline-grid">
        {steps.map((step, idx) => (
          <div key={step.num} className="workflow-step-card">
            <div className="step-card-top">
              <div className="step-num-badge">{step.num}</div>
              <div className="step-icon-wrap">{step.icon}</div>
            </div>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-desc">{step.desc}</p>
            {idx < steps.length - 1 && <div className="step-connector-line" />}
          </div>
        ))}
      </div>
    </section>
  );
}
