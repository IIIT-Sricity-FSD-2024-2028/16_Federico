'use strict';

import React from 'react';

/**
 * HospitalBackground
 * 
 * Provides an atmospheric hospital-themed visual backdrop:
 * - Subtle medical coordinate grid with delicate cross-hair nodes
 * - Smooth animated ECG telemetry heartbeat rhythm line (optional via showEcg)
 * - Luminous clinical ambient glow orbs (Federico Violet + Medical Cyan + Soft Amber)
 * - Strict compositor-only performance & prefers-reduced-motion fallback
 */
export default function HospitalBackground({ showEcg = true }) {
  return (
    <div className="hospital-bg-root" aria-hidden="true">
      {/* Medical Cross Grid */}
      <div className="hospital-grid-pattern" />

      {/* Bioluminescent Clinical Glow Orbs */}
      <div className="hospital-glow-orb hospital-glow-cyan" />
      <div className="hospital-glow-orb hospital-glow-violet" />
      <div className="hospital-glow-orb hospital-glow-amber" />

      {/* Animated Cardiac Telemetry Line (Heartbeat) */}
      {showEcg && (
        <div className="hospital-ecg-container">
          <svg
            className="hospital-ecg-svg"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              className="hospital-ecg-path"
              d="M0,60 L280,60 L295,60 L305,35 L315,90 L325,10 L335,110 L345,60 L360,60 L400,60 L700,60 L715,60 L725,40 L735,85 L745,15 L755,105 L765,60 L780,60 L820,60 L1120,60 L1135,60 L1145,38 L1155,88 L1165,12 L1175,108 L1185,60 L1200,60 L1440,60"
            />
          </svg>
        </div>
      )}

      {/* Subtle Noise / Depth Veil */}
      <div className="hospital-depth-veil" />
    </div>
  );
}
