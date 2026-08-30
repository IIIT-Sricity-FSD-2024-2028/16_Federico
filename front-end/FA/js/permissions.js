'use strict';

/**
 * FA/js/permissions.js — Finance Associate route access & role permissions.
 */
const Permissions = {
  routeAccess: {
    ADMIN: ['dashboard', 'charges', 'ledger', 'eod', 'discharge', 'receipts'],
    SUPER_USER: ['dashboard', 'charges', 'ledger', 'eod', 'discharge', 'receipts'],
    ORG_ADMIN: ['dashboard', 'charges', 'ledger', 'eod', 'discharge', 'receipts'],
  },

  getActor() {
    return window.RoleAccess?.getCurrentActor() || 'FA';
  },

  getAccessRole() {
    return window.RoleAccess?.getAccessRole() || 'ADMIN';
  },

  canAccess(route) {
    const raw = String(route || '').replace(/^#\/?/, '') || 'dashboard';
    const page = raw.split('/')[0].split('?')[0] || 'dashboard';
    const allowedRoutes = this.routeAccess[this.getAccessRole()] || ['dashboard', 'charges', 'ledger', 'eod', 'discharge', 'receipts'];
    return allowedRoutes.includes(page) && (window.RoleAccess?.hasModuleAccess('FA', this.getActor()) ?? true);
  },

  getDefaultRoute() {
    const allowedRoutes = this.routeAccess[this.getAccessRole()] || ['dashboard'];
    return '#/' + (allowedRoutes[0] || 'dashboard');
  },

  enforceRoute(route) {
    if (this.canAccess(route)) return true;

    const fallback = this.getDefaultRoute();
    if (location.hash !== fallback) location.hash = fallback;
    return false;
  },

  updateUI() {
    const indicator = document.getElementById('role-indicator');
    const currentActor = this.getActor();
    const accessRole = this.getAccessRole();
    if (indicator) {
      indicator.innerText = currentActor === 'HOM'
        ? 'superUser · Finance Control'
        : 'admin · Finance Operations';
    }

    const links = document.querySelectorAll('.nav-link');
    links.forEach((link) => {
      const match = link.getAttribute('onclick')?.match(/'([^']+)'/);
      const route = match ? match[1] : '#/dashboard';
      link.style.display = this.canAccess(route) ? '' : 'none';
    });
    if (typeof window.updateActiveNav === 'function') window.updateActiveNav();
  },
};

window.Permissions = Permissions;
