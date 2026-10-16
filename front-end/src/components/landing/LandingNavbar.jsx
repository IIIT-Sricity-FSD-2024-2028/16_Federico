'use strict';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hospital, Menu, X, ArrowRight } from 'lucide-react';

/**
 * LandingNavbar
 * 
 * Floating glassmorphic header following Apple's frosted navigation aesthetic.
 * Features live hospital network ping, smooth section scroll links, and direct portal entry points.
 */
export default function LandingNavbar() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`landing-nav-wrapper ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="landing-nav-container">
        {/* Brand */}
        <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} role="button" tabIndex={0}>
          <div className="brand-emblem">
            <span className="brand-letter">F</span>
            <span className="brand-live-pulse" title="Cloud Core Active" />
          </div>
          <div className="brand-info">
            <span className="brand-name">Federico</span>
            <span className="brand-tagline">Clinical Cloud</span>
          </div>
        </div>


        {/* Desktop Navigation Links */}
        <nav className="landing-nav-links" aria-label="Main Navigation">
          <button type="button" className="nav-link" onClick={() => scrollToSection('about')}>
            About
          </button>
          <button type="button" className="nav-link" onClick={() => scrollToSection('health-hub')}>
            Patient Wellness
          </button>
          <button type="button" className="nav-link" onClick={() => scrollToSection('features')}>
            Architecture
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="landing-nav-actions">
          <button
            id="marketplace-btn"
            type="button"
            className="nav-btn-secondary"
            onClick={() => navigate('/marketplace/marketplace-page.html')}
          >
            <Hospital size={15} />
            <span>Hospitals</span>
          </button>

          <button
            id="login-btn"
            type="button"
            className="nav-btn-primary"
            onClick={() => navigate('/login/login-page.html')}
          >
            <span>Sign In</span>
            <ArrowRight size={15} />
          </button>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="mobile-toggle-btn"
            aria-label="Toggle mobile menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <nav className="mobile-nav-links">
            <button type="button" className="mobile-link" onClick={() => scrollToSection('about')}>
              About Project
            </button>
            <button type="button" className="mobile-link" onClick={() => scrollToSection('health-hub')}>
              Patient Health &amp; Wellness
            </button>
            <button type="button" className="mobile-link" onClick={() => scrollToSection('features')}>
              Clean Architecture
            </button>
          </nav>
          <div className="mobile-drawer-actions">
            <button
              type="button"
              className="drawer-btn-secondary"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/marketplace/marketplace-page.html');
              }}
            >
              <Hospital size={16} /> Browse Hospitals
            </button>
            <button
              type="button"
              className="drawer-btn-primary"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login/login-page.html');
              }}
            >
              Sign In to Portal <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
