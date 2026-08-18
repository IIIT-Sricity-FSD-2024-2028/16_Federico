/**
 * shared/auth-guard.js — ONE auth guard for every app, replacing the 5
 * near-identical copies previously duplicated in Patient/, HOM/, FA/js/,
 * and PRE/js/ (each hand-rolling the same "check actor, else alert() +
 * redirect" logic independently). Delegates all the real logic to
 * `RoleAccess.enforceModuleAccess`, which already existed in shared/rbac.js
 * but — before this file — nothing actually called it.
 *
 * Usage: declare the module BEFORE loading this script:
 *   <script>window.APP_MODULE = "HOM";</script>
 *   <script src="../shared/rbac.js"></script>
 *   <script src="../shared/ui-feedback.js"></script>
 *   <script src="../shared/auth-guard.js"></script>
 * (module values: "HOM" | "FA" | "PRE" | "PATIENT")
 */
(function () {
  if (!window.RoleAccess || !window.APP_MODULE) return;

  var ok = window.RoleAccess.enforceModuleAccess(window.APP_MODULE);
  if (!ok) return;

  // The Patient app previously exposed a window.PatientSession global from
  // its own auth-guard copy — several Patient pages read it directly.
  // Preserved here so no Patient-app call site needs to change.
  if (window.APP_MODULE === "PATIENT") {
    var session = window.RoleAccess.getSessionInfo();
    window.PatientSession = {
      uhid: (session && session.patientUhid) || null,
      patientId: (session && session.patientId) || null,
      loggedIn: true,
    };
  }
})();
