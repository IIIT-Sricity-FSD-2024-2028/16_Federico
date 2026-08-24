'use strict';

/**
 * front-end/shared/shared-nav.js
 * Unified, accessible top navigation component for Federico Healthcare Platform.
 * Supports dynamic branding, role switching, notifications overlay, and user profile dropdowns.
 */
(function () {
  function escape(str) {
    if (window.Formatters && typeof window.Formatters.escapeHtml === 'function') {
      return window.Formatters.escapeHtml(str);
    }
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderNavbar(config) {
    var container = document.getElementById(config.containerId || 'main-nav');
    if (!container) return;

    var roleName = config.roleName || 'Staff';
    var brandName = config.brandName || 'Federico';
    var links = config.links || [];
    var currentPath = window.location.pathname.split('/').pop();

    var linksHtml = links
      .map(function (item) {
        var isActive = item.href === currentPath || (item.activeRoutes && item.activeRoutes.includes(currentPath));
        return (
          '<a class="nav-link' +
          (isActive ? ' active' : '') +
          '" href="' +
          escape(item.href) +
          '">' +
          escape(item.label) +
          '</a>'
        );
      })
      .join('');

    var safeBrand = escape(brandName);
    var safeRole = escape(roleName);
    var brandInitial = escape(brandName.charAt(0) || 'F');
    var roleInitial = escape(roleName.slice(0, 2).toUpperCase() || 'ST');

    var navHtml = `
      <style>
        .top-nav { height: 76px; background: var(--color-bg); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; font-family: var(--font-body); }
        .nav-logo-group { display: flex; align-items: center; gap: 12px; }
        .nav-logo-icon { width: 32px; height: 32px; border-radius: var(--radius-sm, 8px); background: var(--color-accent); color: var(--md-on-primary, #fff); display: grid; place-items: center; font-family: var(--font-heading); font-size: 16px; font-weight: 700; }
        .nav-logo-text { font-family: var(--font-heading); font-size: 19px; display: flex; gap: 6px; }
        .nav-logo-text .brand-title { color: var(--color-fg); }
        .nav-logo-text .hospital-subtitle { color: var(--color-muted-fg); font-style: italic; }
        .nav-links { display: flex; align-items: center; gap: 4px; }
        .nav-link { padding: 10px 16px; border-radius: var(--radius-full, 9999px); font-size: 13px; font-weight: 500; letter-spacing: 0.01em; color: var(--color-muted-fg); text-decoration: none; transition: color var(--duration-base) var(--ease-luxury), background-color var(--duration-fast) var(--ease-luxury); cursor: pointer; border: none; background: transparent; }
        .nav-link:hover { color: var(--color-fg); background: rgba(103, 80, 164, 0.08); }
        .nav-link.active { background: var(--md-secondary-container, var(--color-muted-bg)); color: var(--md-on-secondary-container, var(--color-fg)); font-weight: 600; }
        .nav-actions { display: flex; align-items: center; gap: 16px; position: relative; }
        .nav-profile { display: flex; align-items: center; gap: 10px; padding: 6px 14px 6px 6px; border-radius: var(--radius-full, 9999px); background: transparent; border: 1px solid var(--color-border); cursor: pointer; transition: border-color var(--duration-base) var(--ease-luxury), background-color var(--duration-fast) var(--ease-luxury); }
        .nav-profile:hover { border-color: var(--color-accent); background: rgba(103, 80, 164, 0.06); }
        .nav-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--color-accent); color: var(--md-on-primary, #fff); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
        .nav-profile-text { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; color: var(--color-fg); }
        .nav-overlay { position: absolute; top: calc(100% + 8px); background: var(--color-bg); border-radius: var(--radius-lg, 16px); box-shadow: var(--shadow-card-hover); border: 1px solid var(--color-border); display: none; flex-direction: column; overflow: hidden; z-index: 100; right: 0; width: 220px; }
        .nav-overlay.active { display: flex; }
        .profile-item { padding: 10px 16px; font-size: 13px; color: var(--color-muted-fg); cursor: pointer; display: flex; align-items: center; gap: 8px; background: var(--color-bg); border: none; width: 100%; text-align: left; transition: background var(--duration-base) var(--ease-luxury); }
        .profile-item:hover { background: var(--color-muted-bg); color: var(--color-fg); }
        .profile-item.danger { color: var(--status-error); border-top: 1px solid var(--color-border); }
      </style>
      <div class="top-nav">
        <div class="nav-logo-group">
          <div class="nav-logo-icon">${brandInitial}</div>
          <div class="nav-logo-text">
            <span class="brand-title">${safeBrand}</span>
            <span class="hospital-subtitle">Hospital</span>
          </div>
        </div>
        <div class="nav-links">${linksHtml}</div>
        <div class="nav-actions">
          <div class="nav-profile" id="nav-profile-btn" role="button" aria-haspopup="true" aria-expanded="false">
            <div class="nav-avatar">${roleInitial}</div>
            <span class="nav-profile-text">${safeRole}</span>
          </div>
          <div class="nav-overlay" id="nav-profile-menu" role="menu">
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--color-border); font-size: 11px; color: var(--color-muted-fg);">Signed in as <strong>${safeRole}</strong></div>
            <button class="profile-item danger" id="nav-signout-btn" role="menuitem">Sign Out</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = navHtml;

    var profileBtn = document.getElementById('nav-profile-btn');
    var profileMenu = document.getElementById('nav-profile-menu');
    var signoutBtn = document.getElementById('nav-signout-btn');

    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = profileMenu.classList.toggle('active');
        profileBtn.setAttribute('aria-expanded', String(isOpen));
      });
      document.addEventListener('click', function () {
        profileMenu.classList.remove('active');
        profileBtn.setAttribute('aria-expanded', 'false');
      });
    }

    if (signoutBtn) {
      signoutBtn.addEventListener('click', async function () {
        try {
          if (window.API && window.API.auth && typeof window.API.auth.logout === 'function') {
            await window.API.auth.logout();
          } else if (window.ApiClient && window.ApiClient.auth && typeof window.ApiClient.auth.logout === 'function') {
            await window.ApiClient.auth.logout();
          }
        } catch (_) {}
        window.location.href = '../login/login-page.html';
      });
    }
  }

  window.SharedNav = Object.freeze({
    renderNavbar: renderNavbar,
  });
})();
