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

  // Demo credentials shown on the login page's per-role helper panel.
  // Matches the seed users in back-end/src/store/dataStore.js exactly —
  // see back-end/docs/phase2-source-of-truth.md.
  var mockAccounts = {
    Patient: [
      { email: "hamiz@hosp.com", password: "Hamiz@123", displayName: "Hamiz Shams" },
      { email: "salma@hosp.com", password: "Salma@123", displayName: "Salma Begum" },
      { email: "john@hosp.com", password: "John@123", displayName: "John Doe" },
    ],
    PRE: [{ email: "rekha.pre@hosp.com", password: "Pre@123", displayName: "Rekha Nair" }],
    HOM: [{ email: "admin@hosp.com", password: "Hom@123", displayName: "Admin User" }],
    FA: [{ email: "farah.fa@hosp.com", password: "Fa@123", displayName: "Farah Ansari" }],
  };

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
   * Real login. Returns { actor, profile, account } on success, or null
   * on invalid credentials / network failure — same truthy/falsy contract
   * the original synchronous version had, just now a Promise.
   */
  async function authenticate(actor, email, password) {
    try {
      var result = await window.ApiClient.auth.login(email, password);
      if (result.role !== actor) return null; // valid login, wrong role tab

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
      });

      return { actor: actor, profile: profile, account: { email: result.user.email, displayName: result.user.name } };
    } catch (err) {
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
    });

    return result;
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

    if (currentActor === "HOM") {
      if (currentModule === "HOM") return "screen-01-dashboard.html";
      return "../HOM/screen-01-dashboard.html";
    }

    if (currentActor === "FA") {
      if (currentModule === "FA") return "index.html";
      return "../FA/index.html";
    }

    if (currentActor === "PRE") {
      if (currentModule === "PRE") return "../index.html";
      return "../PRE/index.html";
    }

    if (currentActor === "Patient") {
      if (currentModule === "PATIENT") return "patient-dashboard.html";
      return "../Patient/patient-dashboard.html";
    }

    return "../login/login-page.html";
  }

  function detectCurrentModule() {
    var path = window.location.pathname.replace(/\\/g, "/");
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
      alert("Access Denied: " + currentActor + " cannot open the " + moduleName + " module.");
    }
    window.location.href = fallbackUrl;
    return false;
  }

  window.RoleAccess = {
    profiles: actorProfiles,
    mockAccounts: mockAccounts,
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
  };
})();
