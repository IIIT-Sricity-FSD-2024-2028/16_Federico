/**
 * shared/rbac.js — Phase 3 rewrite.
 *
 * Calls POST /auth/login (bcrypt-verified on the backend) and persists the
 * session in `sessionStorage` via `ApiClient.setSession()` for per-tab session
 * isolation (allowing multiple roles/actors to operate simultaneously across tabs).
 * Sibling tabs sharing the exact same token synchronize logout via BroadcastChannel.
 *
 * Public interface (`window.RoleAccess.*`) is kept backward-compatible so
 * the per-app `auth-guard.js` files — which call `getCurrentActor()`,
 * `hasModuleAccess()`, `getActorHome()` synchronously — work seamlessly.
 */
(function () {
  'use strict';
  var actorProfiles = {
    // Distinct from FA's legacy `accessRole: "ADMIN"` label below (an old
    // Phase-1 name that predates this Admin actor and has nothing to do
    // with hospital administration) — deliberately "ORG_ADMIN" so the two
    // can never be confused in an `authorize(['ADMIN', ...])` legacy check.
    Admin: {
      actor: "Admin",
      accessRole: "ORG_ADMIN",
      label: "Admin",
      modules: ["ADMIN", "ANALYTICS", "ADMISSIONS", "INVENTORY", "DOCTOR", "PATIENT", "BILLING", "APPOINTMENTS", "INSURANCE", "LEADERSHIP"],
    },
    Patient: {
      actor: "Patient",
      accessRole: "PATIENT",
      label: "Patient",
      modules: ["PATIENT"],
    },
    PRE: {
      actor: "PRE",
      accessRole: "OPERATIONS",
      label: "PRE Operator",
      modules: ["PRE"],
    },
    HOM: {
      actor: "HOM",
      accessRole: "SUPER_USER",
      label: "Super User",
      modules: ["HOM", "FA", "PRE", "PATIENT"],
    },
    FA: {
      actor: "FA",
      accessRole: "ADMIN",
      label: "Admin",
      modules: ["FA"],
    },
  };

  // Demo credentials shown on the login page's per-role helper panel, now
  // keyed by organization_id since provisioning a second demo org (Apollo
  // Hospitals, organization_id 2) means a role's demo login differs by
  // which hospital is selected — see back-end/docs/README.md
  // for the source of truth these mirror. Falls back to
  // organization 1's accounts if a org has none listed (keeps working for
  // orgs the demo panel doesn't know about, e.g. freshly provisioned ones,
  // just showing federico-general's accounts as a "here's the shape" hint
  // — enforceModuleAccess-style graceful degradation over silence).
  var mockAccountsByOrg = {
    1: {
      Admin: [{ email: "owner@hosp.com", password: "Owner@123", displayName: "Hospital Owner" }],
      Patient: [
        { email: 'arjun.k@hosp.com', password: 'Hamiz@123', displayName: 'Arjun Kapoor' },
        { email: 'priyanka.n@hosp.com', password: 'Salma@123', displayName: 'Priyanka Nair' },
        { email: 'rohan.m@hosp.com', password: 'John@123', displayName: 'Rohan Mehta' },
      ],
      PRE: [
        { email: "rekha.pre@hosp.com", password: "Pre@123", displayName: "Rekha Nair" },
        { email: "billing.assist@hosp.com", password: "Assist@123", displayName: "Billing Assist (custom-role demo)" },
      ],
      HOM: [{ email: "admin@hosp.com", password: "Hom@123", displayName: "Admin User" }],
      FA: [{ email: "farah.fa@hosp.com", password: "Fa@123", displayName: "Farah Ansari" }],
    },
    2: {
      Admin: [{ email: "owner@apollo.hosp.com", password: "Apollo@123", displayName: "Apollo Owner" }],
      Patient: [{ email: "meera@apollo.hosp.com", password: "Apollo@123", displayName: "Meera Subramaniam" }],
      PRE: [{ email: "priya.pre@apollo.hosp.com", password: "Apollo@123", displayName: "Priya Krishnan" }],
      HOM: [{ email: "admin@apollo.hosp.com", password: "Apollo@123", displayName: "Apollo Admin" }],
      FA: [{ email: "rajesh.fa@apollo.hosp.com", password: "Apollo@123", displayName: "Rajesh Iyer" }],
    },
  };

  function mockAccountsFor(organizationId) {
    if (!organizationId) return mockAccountsByOrg[1];
    return mockAccountsByOrg[organizationId] || null;
  }

  // Back-compat: organization 1's accounts, for any caller not yet passing
  // an organizationId.
  var mockAccounts = mockAccountsByOrg[1];

  function getProfile(actor) {
    return actorProfiles[actor || getCurrentActor()] || null;
  }

  function getCurrentActor() {
    var session = window.ApiClient && window.ApiClient.getSession();
    return (session && session.actor) || "";
  }

  function getSessionInfo() {
    return window.ApiClient ? window.ApiClient.getSession() : null;
  }

  function loginAs(actor) {
    return getProfile(actor);
  }

  /**
   * Real login. `organizationId` is optional — set by the marketplace
   * "pick an organization first" flow (tasks.md §11); the backend
   * cross-checks it against the resolved account and rejects a mismatch.
   * Returns { actor, profile, account } on success, or null on invalid
   * credentials / network failure — same truthy/falsy contract the
   * original synchronous version had, just now a Promise. On failure the
   * caller can inspect `RoleAccess.lastAuthError` for a specific message.
   */
  var lastAuthError = null;

  async function authenticate(actor, email, password, organizationId) {
    lastAuthError = null;
    try {
      var result = await window.ApiClient.auth.login(email, password, organizationId);
      if (result.role !== actor) {
        lastAuthError = "That account is not a " + actor + " account.";
        return null;
      }

      var profile = getProfile(actor);
      if (!profile) return null;

      window.ApiClient.setSession({
        token: result.token,
        actor: actor,
        role: profile.accessRole,
        userId: result.user.user_id,
        patientId: result.patient ? result.patient.patient_id : null,
        patientUhid: result.patient ? result.patient.uhid : null,
        displayName: result.user.name,
        email: result.user.email,
        tenant: result.tenant || null,
      });

      return { actor: actor, profile: profile, account: { email: result.user.email, displayName: result.user.name } };
    } catch (err) {
      lastAuthError = (err && err.message) || "Login failed. Please try again.";
      return null;
    }
  }

  /**
   * Real patient self-registration via POST /auth/signup. Throws on
   * failure (409 email taken, 400 validation) so the caller can show the
   * server's actual message instead of guessing client-side.
   */
  async function signupPatient(payload) {
    var result = await window.ApiClient.auth.signup(payload);
    var profile = getProfile("Patient");

    window.ApiClient.setSession({
      token: result.token,
      actor: "Patient",
      role: profile.accessRole,
      userId: result.user.user_id,
      patientId: result.patient.patient_id,
      patientUhid: result.patient.uhid,
      displayName: result.user.name,
      email: result.user.email,
      tenant: result.tenant || null,
    });

    return result;
  }

  /** Tenant Context Service (tasks.md §12) — org id/name/branding/enabled modules for the signed-in session. */
  function getTenantContext() {
    var session = getSessionInfo();
    return (session && session.tenant) || null;
  }

  // Human labels for the "Module Not Available" dialog + locked chips.
  var MODULE_LABELS = {
    APPOINTMENTS: "Appointments",
    ADMISSIONS: "Admissions & Bed Management",
    INVENTORY: "Inventory & Procurement",
    BILLING: "Billing",
    INSURANCE: "Insurance",
    ANALYTICS: "Administrative Analytics",
    DOCTOR: "Doctor Management",
    PATIENT: "Patient Management",
    LEADERSHIP: "Service Charge Approvals",
  };

  function moduleLabel(code) {
    return MODULE_LABELS[String(code || "").toUpperCase()] || code;
  }

  /**
   * Module Entitlement check — "has this ORGANIZATION purchased/enabled the
   * module?". Separate from RBAC (hasModuleAccess, which is actor→portal).
   * Reads the richer `tenant.modules` map when the backend supplies it,
   * falling back to the legacy `enabled_modules` array.
   */
  function hasModule(moduleCode) {
    var tenant = getTenantContext();
    if (!tenant) return false;
    var code = String(moduleCode || "").toUpperCase();
    if (tenant.modules && typeof tenant.modules === "object" && code in tenant.modules) {
      return Boolean(tenant.modules[code]);
    }
    return Boolean(tenant.enabled_modules && tenant.enabled_modules.indexOf(code) !== -1);
  }

  /** Resource Entitlement — units of a resource type the org bought (0 if none). */
  function resourceQty(moduleCode, resourceCode) {
    var tenant = getTenantContext();
    var mod = String(moduleCode || "").toUpperCase();
    var res = String(resourceCode || "").toUpperCase();
    if (!tenant || !tenant.resources || !tenant.resources[mod]) return 0;
    return Number(tenant.resources[mod][res]) || 0;
  }

  function getEntitlements() {
    var tenant = getTenantContext();
    return {
      modules: (tenant && tenant.modules) || {},
      resources: (tenant && tenant.resources) || {},
    };
  }

  /** The standard "Module Not Available" message (tasks.md wording). */
  function showModuleUnavailable(moduleCode) {
    var label = moduleLabel(moduleCode);
    var body =
      "This module is not enabled for your organization. " +
      "Please purchase or enable this module to access this feature.";
    if (window.UIFeedback && typeof window.UIFeedback.alert === "function") {
      window.UIFeedback.alert({ title: "Module Not Available", body: body });
    } else {
      window.alert("Module Not Available\n\n" + body);
    }
    return false;
  }

  // Injects the locked-state styles once. Deliberately subtle — greys the
  // element, adds a small 🔒, and blocks pointer interaction on the element
  // itself (a capturing click handler shows the dialog).
  function ensureLockStyles() {
    if (document.getElementById("federico-module-lock-styles")) return;
    var style = document.createElement("style");
    style.id = "federico-module-lock-styles";
    style.textContent =
      ".module-locked{opacity:.5;filter:grayscale(.6);cursor:not-allowed !important;position:relative;}" +
      ".module-locked::after{content:'\\1F512';font-size:.85em;margin-left:6px;opacity:.8;}" +
      ".module-locked *{pointer-events:none !important;}" +
      "a.module-locked,button.module-locked{text-decoration:none;}";
    document.head.appendChild(style);
  }

  /**
   * Applies the locked treatment to one element for a disabled module:
   * keeps it visible (so the user sees the feature exists) but greys it and
   * routes clicks to the "Module Not Available" dialog instead of navigating.
   * `data-lock-mode="hide"` opts an element into being hidden instead.
   */
  function lockElement(el, moduleCode) {
    if (!el || el.dataset.moduleLockBound === "1") return;
    if (el.getAttribute("data-lock-mode") === "hide") {
      el.style.display = "none";
      return;
    }
    ensureLockStyles();
    el.classList.add("module-locked");
    el.setAttribute("aria-disabled", "true");
    el.dataset.moduleLockBound = "1";
    el.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        // stopImmediatePropagation so an inline onclick="navigate(...)" on
        // the same element (FA/PRE SPA nav) doesn't still fire.
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        e.stopPropagation();
        showModuleUnavailable(moduleCode);
      },
      true,
    );
    // Also neutralise a same-element inline handler outright.
    if (el.hasAttribute("onclick")) el.setAttribute("onclick", "return false;");
  }

  function unlockElement(el) {
    if (!el) return;
    el.classList.remove("module-locked");
    el.removeAttribute("aria-disabled");
    el.style.display = "";
  }

  /**
   * Scans the page for [data-requires-module] elements and, for any whose
   * module is disabled for this org, applies the locked treatment (or hides
   * it when data-lock-mode="hide"). Safe to call repeatedly — navs built
   * after auth-guard runs call this again themselves.
   */
  function applyModuleLocks(root) {
    var scope = root || document;
    var els = scope.querySelectorAll("[data-requires-module]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var code = el.getAttribute("data-requires-module");
      if (hasModule(code)) {
        unlockElement(el);
      } else {
        lockElement(el, code);
      }
    }
  }

  /**
   * Tenant Context Service, frontend half (tasks.md §12: "The frontend
   * dynamically updates: Organization Logo, Theme, Enabled Modules,
   * Navigation"). Each app's brand markup differs (see comments below),
   * so this targets each app's known subtitle element directly rather
   * than guessing a universal selector; apps whose nav is built after
   * auth-guard.js runs (HOM's shared-nav.js) call this again themselves
   * once their nav DOM actually exists — see that file's own call site.
   *
   * Safe to call multiple times / before a tenant exists (no-ops quietly).
   */
  function applyTenantBranding() {
    var tenant = getTenantContext();

    // Feature-flag treatment — any element, in any app, tagged
    // data-requires-module="CODE" is shown LOCKED (greyed + 🔒, click opens
    // the "Module Not Available" dialog) when that module is off for the
    // signed-in org, so the user sees the feature exists but isn't in their
    // subscription. Add data-lock-mode="hide" to hide instead of lock.
    applyModuleLocks(document);

    if (!tenant || !tenant.organization_name) return;

    // HOM: shared-nav.js renders `<span class="hospital">Hospital</span>` —
    // replace the generic placeholder with the real organization name.
    var homSubtitle = document.querySelector(".nav-logo-text .hospital");
    if (homSubtitle) homSubtitle.textContent = tenant.organization_name;

    // Patient: `.brand-text` renders `<strong>Federico</strong><span>...</span>` —
    // same replacement.
    var patientSubtitle = document.querySelector(".brand-text span");
    if (patientSubtitle) patientSubtitle.textContent = tenant.organization_name;

    // FA: `.logo-group` has no subtitle element at all — add one once.
    var faLogoGroup = document.querySelector(".logo-group");
    if (faLogoGroup && !faLogoGroup.querySelector(".tenant-org-label")) {
      var faLabel = document.createElement("span");
      faLabel.className = "tenant-org-label";
      faLabel.textContent = tenant.organization_name;
      faLogoGroup.appendChild(faLabel);
    }

    // PRE: `.logo .text` has `<h2>Federico</h2><p>role label</p>` — append
    // the organization name as its own line, once.
    var preLogoText = document.querySelector(".logo .text");
    if (preLogoText && !preLogoText.querySelector(".tenant-org-label")) {
      var preLabel = document.createElement("p");
      preLabel.className = "tenant-org-label";
      preLabel.textContent = tenant.organization_name;
      preLogoText.appendChild(preLabel);
    }
  }

  function logout() {
    if (window.ApiClient && window.ApiClient.auth && typeof window.ApiClient.auth.logout === "function") {
      window.ApiClient.auth.logout(); // best-effort async server-side invalidation
    } else {
      try {
        sessionStorage.removeItem("FedericoSession");
      } catch (err) {
        console.warn("[RoleAccess] Failed to remove session from sessionStorage:", err);
      }
    }
  }

  function getAccessRole() {
    var session = getSessionInfo();
    if (session && session.role) return session.role;
    var profile = getProfile();
    return profile ? profile.accessRole : "";
  }

  function hasModuleAccess(moduleName, actor) {
    var profile = getProfile(actor);
    return Boolean(profile && profile.modules.includes(moduleName));
  }

  function isSuperUser(actor) {
    return getProfile(actor)?.accessRole === "SUPER_USER";
  }

  function isAdmin(actor) {
    return getProfile(actor)?.accessRole === "ADMIN";
  }

  function getActorHome(actor, fromModule) {
    var currentActor = actor || getCurrentActor();
    var currentModule = fromModule || detectCurrentModule();

    // Every other app's pages live one directory level below front-end/
    // (e.g. HOM/screen-01-dashboard.html, FA/fa-dashboard.html), but PRE's real
    // pages live one level deeper still, under PRE/pages/*.html — the
    // only PRE page at the shallow depth is PRE/index.html, which is a
    // static redirect that never loads rbac.js or calls this function.
    // So whenever the caller is PRE, every cross-module path below needs
    // one extra "../" to escape that extra nesting.
    var crossModulePrefix = currentModule === "PRE" ? "../" : "";

    if (currentActor === "HOM") {
      if (currentModule === "HOM") return "screen-01-dashboard.html";
      return crossModulePrefix + "../HOM/screen-01-dashboard.html";
    }

    if (currentActor === "Admin") {
      if (currentModule === "ADMIN") return "screen-01-dashboard.html";
      return crossModulePrefix + "../Admin/screen-01-dashboard.html";
    }

    if (currentActor === "FA") {
      if (currentModule === "FA") return "fa-dashboard.html";
      return crossModulePrefix + "../FA/fa-dashboard.html";
    }

    if (currentActor === "PRE") {
      if (currentModule === "PRE") return "PRE.html";
      return crossModulePrefix + "../PRE/pages/PRE.html";
    }

    if (currentActor === "Patient") {
      if (currentModule === "PATIENT") return "patient-dashboard.html";
      return crossModulePrefix + "../Patient/patient-dashboard.html";
    }

    return crossModulePrefix + "../login/login-page.html";
  }

  function detectCurrentModule() {
    var path = window.location.pathname.replace(/\\/g, "/");
    if (path.includes("/Admin/")) return "ADMIN";
    if (path.includes("/HOM/")) return "HOM";
    if (path.includes("/FA/")) return "FA";
    if (path.includes("/PRE/")) return "PRE";
    if (path.includes("/Patient/")) return "PATIENT";
    return "";
  }

  function enforceModuleAccess(moduleName, options) {
    var settings = options || {};
    var currentActor = getCurrentActor();

    if (!currentActor) {
      window.location.href = settings.unauthenticatedRedirect || getActorHome("", detectCurrentModule());
      return false;
    }

    if (hasModuleAccess(moduleName, currentActor)) return true;

    var fallbackUrl = settings.unauthorizedRedirect || getActorHome(currentActor, detectCurrentModule());
    if (settings.alertMessage !== false) {
      var message = "Access denied — " + currentActor + " cannot open the " + moduleName + " module.";
      if (window.UIFeedback) {
        window.UIFeedback.toast(message, "error");
        // Non-blocking: give the snackbar a moment on screen before leaving
        // the page, instead of a native alert() that would freeze it.
        setTimeout(function () { window.location.href = fallbackUrl; }, 1100);
        return false;
      }
      // UIFeedback not loaded on this page (shouldn't happen post-redesign,
      // kept only as a defensive fallback) — fall through to immediate redirect.
    }
    window.location.href = fallbackUrl;
    return false;
  }

  window.RoleAccess = {
    profiles: actorProfiles,
    mockAccounts: mockAccounts,
    mockAccountsFor: mockAccountsFor,
    authenticate: authenticate,
    signupPatient: signupPatient,
    loginAs: loginAs,
    logout: logout,
    getCurrentActor: getCurrentActor,
    getAccessRole: getAccessRole,
    getProfile: getProfile,
    getActorHome: getActorHome,
    detectCurrentModule: detectCurrentModule,
    hasModuleAccess: hasModuleAccess,
    enforceModuleAccess: enforceModuleAccess,
    isSuperUser: isSuperUser,
    isAdmin: isAdmin,
    getSessionInfo: getSessionInfo,
    getTenantContext: getTenantContext,
    applyTenantBranding: applyTenantBranding,
    hasModule: hasModule,
    resourceQty: resourceQty,
    getEntitlements: getEntitlements,
    moduleLabel: moduleLabel,
    showModuleUnavailable: showModuleUnavailable,
    applyModuleLocks: applyModuleLocks,
    lockElement: lockElement,
    get lastAuthError() { return lastAuthError; },
  };
})();
