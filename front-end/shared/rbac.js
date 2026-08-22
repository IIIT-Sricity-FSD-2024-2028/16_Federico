/**
 * shared/rbac.js — Phase 3 rewrite.
 *
 * The original version authenticated entirely client-side against a
 * hardcoded JS array — no server call at all, and login/session lived in
 * `sessionStorage` (invisible across tabs). This version calls the real
 * `POST /auth/login` (bcrypt-verified on the backend) and persists the
 * session in `localStorage` via `ApiClient.setSession()` so a logged-in
 * actor stays logged in across every tab/window of the browser.
 *
 * Public interface (`window.RoleAccess.*`) is kept as close to the
 * original as possible so the per-app `auth-guard.js` files — which call
 * `getCurrentActor()`, `hasModuleAccess()`, `getActorHome()` synchronously
 * — did not need to change at all. Only `authenticate()` had to become
 * async (it now makes a network call), which only touches login-page.js.
 */
(function () {
  var actorProfiles = {
    // Distinct from FA's legacy `accessRole: "ADMIN"` label below (an old
    // Phase-1 name that predates this Admin actor and has nothing to do
    // with hospital administration) — deliberately "ORG_ADMIN" so the two
    // can never be confused in an `authorize(['ADMIN', ...])` legacy check.
    Admin: {
      actor: "Admin",
      accessRole: "ORG_ADMIN",
      label: "Admin",
      modules: ["ADMIN"],
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
  // which hospital is selected — see scripts/seed-multitenant.js's header
  // comment for the source of truth these mirror. Falls back to
  // organization 1's accounts if a org has none listed (keeps working for
  // orgs the demo panel doesn't know about, e.g. freshly provisioned ones,
  // just showing federico-general's accounts as a "here's the shape" hint
  // — enforceModuleAccess-style graceful degradation over silence).
  var mockAccountsByOrg = {
    1: {
      Admin: [{ email: "owner@hosp.com", password: "Owner@123", displayName: "Hospital Owner" }],
      Patient: [
        { email: "hamiz@hosp.com", password: "Hamiz@123", displayName: "Hamiz Shams" },
        { email: "salma@hosp.com", password: "Salma@123", displayName: "Salma Begum" },
        { email: "john@hosp.com", password: "John@123", displayName: "John Doe" },
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
    return mockAccountsByOrg[organizationId] || mockAccountsByOrg[1];
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

  function hasModule(moduleCode) {
    var tenant = getTenantContext();
    return Boolean(tenant && tenant.enabled_modules && tenant.enabled_modules.includes(moduleCode));
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

    // Feature-flag nav hiding — any element, in any app, tagged
    // data-requires-module="CODE" is hidden when that module is off for
    // the signed-in session's organization. Runs regardless of whether a
    // brand subtitle element was found below.
    var moduleGatedEls = document.querySelectorAll("[data-requires-module]");
    for (var i = 0; i < moduleGatedEls.length; i++) {
      var el = moduleGatedEls[i];
      var code = el.getAttribute("data-requires-module");
      el.style.display = hasModule(code) ? "" : "none";
    }

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
    if (window.ApiClient) {
      window.ApiClient.auth.logout(); // best-effort async server-side invalidation
    } else {
      localStorage.removeItem("FedericoSession");
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
    // (e.g. HOM/screen-01-dashboard.html, FA/index.html), but PRE's real
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
      if (currentModule === "FA") return "index.html";
      return crossModulePrefix + "../FA/index.html";
    }

    if (currentActor === "PRE") {
      if (currentModule === "PRE") return "../index.html";
      return "../PRE/index.html";
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
    get lastAuthError() { return lastAuthError; },
  };
})();
