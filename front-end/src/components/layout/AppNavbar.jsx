'use strict';

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../auth/useSession.js';
import { LOGIN_PATH } from '../../auth/actorHome.js';
import '../css/app-navbar.css';

/**
 * Universal top navigation bar for all Federico portals.
 */
export default function AppNavbar({
  brandName = 'Federico',
  brandInitial = 'F',
  roleName = 'Staff',
  hospitalName,
  links = [],
  userProfile, // Optional: { name, initials, subtitle }
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocClick = () => setMenuOpen(false);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen]);

  async function handleSignOut() {
    if (onLogout) {
      await onLogout();
      return;
    }
    try {
      await logout();
    } catch {
      /* best effort */
    }
    navigate(LOGIN_PATH);
  }

  const effectiveHospital =
    hospitalName ||
    session?.tenant?.hospital_name ||
    session?.tenant?.organization_name ||
    'City General Hospital';

  const userDisplayName =
    userProfile?.name ||
    session?.name ||
    session?.displayName ||
    roleName;

  const userAvatarInitial =
    userProfile?.initials ||
    (userDisplayName ? userDisplayName.charAt(0).toUpperCase() : roleName.slice(0, 2).toUpperCase());

  function isLinkActive(item) {
    const target = item.href || '';
    if (!target) return false;
    if (target.includes('#')) {
      const [pathPart, hashPart] = target.split('#');
      const pathMatches = !pathPart || location.pathname === pathPart || location.pathname.endsWith(pathPart);
      const hashMatches =
        location.hash === '#' + hashPart ||
        location.hash.startsWith('#' + hashPart + '/') ||
        (!location.hash && hashPart === '/ledger');
      return pathMatches && hashMatches;
    }
    if (item.href === '/PRE/pages/PRE.html') {
      return (
        location.pathname === '/PRE/pages/PRE.html' ||
        location.pathname === '/PRE/pages/request.html' ||
        location.pathname === '/PRE/pages/admitted.html' ||
        location.pathname === '/PRE/pages/discharge.html' ||
        location.pathname === '/PRE/pages/rejected.html'
      );
    }
    return location.pathname === target;
  }

  return (
    <nav className="app-navbar">
      <div className="app-navbar-container">
        {/* Brand & Hospital details */}
        <div className="app-navbar-brand-group">
          <div className="app-navbar-logo-icon">{brandInitial}</div>
          <div className="app-navbar-brand-meta">
            <div className="app-navbar-brand-row">
              <span className="app-navbar-brand-title">{brandName}</span>
              {roleName ? <span className="app-navbar-role-badge">{roleName}</span> : null}
            </div>
            <span className="app-navbar-subtitle" title={effectiveHospital}>
              {effectiveHospital}
            </span>
          </div>
        </div>

        {/* Universal Nav Links */}
        <ul className="app-navbar-links">
          {links.map((item) => {
            const linkContent = (
              <Link
                to={item.href}
                className={
                  'app-navbar-link' + (isLinkActive(item) ? ' active' : '')
                }
              >
                {item.label}
              </Link>
            );
            return (
              <li key={item.href || item.label}>
                {linkContent}
              </li>
            );
          })}
        </ul>

        {/* Profile / Action Dropdown */}
        <div className="app-navbar-actions">
          <div
            className="app-navbar-profile-btn"
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMenuOpen((v) => !v);
              }
            }}
          >
            <div className="app-navbar-avatar">{userAvatarInitial}</div>
            <div className="app-navbar-user-text">
              <span className="app-navbar-user-name">{userDisplayName}</span>
              <span className="app-navbar-user-role">{userProfile?.subtitle || roleName}</span>
            </div>
          </div>

          {menuOpen ? (
            <div className="app-navbar-dropdown" role="menu">
              <div className="app-navbar-dropdown-header">
                Signed in as <strong>{userDisplayName}</strong>
              </div>
              <button
                type="button"
                className="app-navbar-dropdown-item danger"
                role="menuitem"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
