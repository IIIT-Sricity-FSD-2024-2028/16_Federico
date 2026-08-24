'use strict';

/**
 * shared/auth-guard.js — Unified Role & Module Guard.
 *
 * Verifies active session and role-based permissions against window.APP_MODULE.
 * If unauthorized or not logged in, redirects to the login screen.
 *
 * Usage:
 *   <script>window.APP_MODULE = "HOM";</script>
 *   <script src="../shared/rbac.js"></script>
 *   <script src="../shared/ui-feedback.js"></script>
 *   <script src="../shared/auth-guard.js"></script>
 */
(function () {
  if (!window.RoleAccess || !window.APP_MODULE) return;

  var ok = window.RoleAccess.enforceModuleAccess(window.APP_MODULE);
  if (!ok) {
    // RoleAccess.enforceModuleAccess already initiated alert and redirect
    return;
  }

  // Apply tenant branding to header elements
  if (typeof window.RoleAccess.applyTenantBranding === 'function') {
    window.RoleAccess.applyTenantBranding();
  }

  // Preserve window.PatientSession for legacy patient page scripts
  if (window.APP_MODULE === 'PATIENT') {
    var session = window.RoleAccess.getSessionInfo();
    window.PatientSession = Object.freeze({
      uhid: (session && session.patientUhid) || null,
      patientId: (session && session.patientId) || null,
      loggedIn: true,
    });
  }
})();
