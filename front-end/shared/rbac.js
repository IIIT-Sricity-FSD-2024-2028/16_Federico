(function () {
  var ROLE_STORAGE_KEY = "accessRole";
  var ACTOR_STORAGE_KEY = "userRole";
  var AUTH_EMAIL_KEY = "authEmail";
  var AUTH_NAME_KEY = "authDisplayName";
  var PATIENT_UHID_KEY = "patientUhid";
  var PATIENT_ACCOUNT_STORAGE_KEY = "patientAuthAccounts";

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

  function titleCase(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\b[a-z]/g, function (match) {
        return match.toUpperCase();
      });
  }

  function buildDemoEmail(name) {
    return (
      String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "") + "@federico.demo"
    );
  }

  function buildDemoPassword(name) {
    var firstName =
      String(name || "")
        .trim()
        .split(/\s+/)[0] || "User";
    return titleCase(firstName) + "@123";
  }

  function buildPatientAccount(seed, admissionId) {
    var admission = seed?.admissions?.[admissionId];
    if (!admission) return null;

    var matchingProfile =
      Object.values(seed.patientProfiles || {}).find(function (profile) {
        return (
          profile?.uhid === admission.uhid ||
          profile?.name === admission.patient_name
        );
      }) || {};

    return {
      email: matchingProfile.email || buildDemoEmail(admission.patient_name),
      password: buildDemoPassword(admission.patient_name),
      displayName: matchingProfile.name || admission.patient_name,
      patientAdmissionId: admissionId,
      patientUhid: admission.uhid || matchingProfile.uhid || null,
    };
  }

  function buildPatientAccounts() {
    var seed = window.CanonicalHospitalSeed?.buildSharedStateSeed?.();
    if (!seed) {
      return [
        {
          email: "hamiz.ahmed@federico.demo",
          password: "Hamiz@123",
          displayName: "Hamiz Ahmed",
          patientAdmissionId: 703,
        },
        {
          email: "qasim.sheikh@federico.demo",
          password: "Qasim@123",
          displayName: "Qasim Sheikh",
          patientAdmissionId: 701,
        },
      ];
    }

    return [703, 701]
      .map(function (admissionId) {
        return buildPatientAccount(seed, admissionId);
      })
      .filter(Boolean);
  }

  function readStoredPatientAccounts() {
    try {
      // Read from unified root state first; fall back to standalone key
      // for backward compat during first-load migration
      var ROOT_KEY = "HospitalAppState";
      var rootRaw = localStorage.getItem(ROOT_KEY);
      if (rootRaw) {
        var root = JSON.parse(rootRaw);
        if (Array.isArray(root.patientAuthAccounts)) {
          return root.patientAuthAccounts;
        }
      }
      // Fallback: standalone key (will be deleted after consolidation)
      var raw = localStorage.getItem(PATIENT_ACCOUNT_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("[RoleAccess] Could not read patient accounts:", error);
      return [];
    }
  }

  function writeStoredPatientAccounts(accounts) {
    // Write to unified root state instead of standalone key
    try {
      var ROOT_KEY = "HospitalAppState";
      var raw = localStorage.getItem(ROOT_KEY);
      var root = raw ? JSON.parse(raw) : {};
      root.patientAuthAccounts = accounts;
      localStorage.setItem(ROOT_KEY, JSON.stringify(root));
    } catch (e) {
      console.warn("[RoleAccess] Could not write patient accounts to root state:", e);
    }
  }

  function getPatientAccounts() {
    var merged = [];
    var seen = {};

    buildPatientAccounts()
      .concat(readStoredPatientAccounts())
      .forEach(function (account) {
        if (!account?.email || !account?.password) return;

        var normalized = {
          email: String(account.email).trim(),
          password: String(account.password).trim(),
          displayName: account.displayName || account.email,
          patientAdmissionId: account.patientAdmissionId || null,
          patientUhid: account.patientUhid || null,
        };
        var key = normalized.email.toLowerCase();
        if (seen[key]) return;
        seen[key] = true;
        merged.push(normalized);
      });

    return merged;
  }

  var mockAccounts = {
    Patient: getPatientAccounts(),
    PRE: [
      {
        email: "rekha.pre@federico.demo",
        password: "Pre@123",
        displayName: "Rekha",
      },
    ],
    HOM: [
      {
        email: "hom.superuser@federico.demo",
        password: "Hom@123",
        displayName: "HOM Super User",
      },
    ],
    FA: [
      {
        email: "fa.admin@federico.demo",
        password: "Fa@123",
        displayName: "Finance Admin",
      },
    ],
  };

  function refreshMockAccounts() {
    mockAccounts.Patient = getPatientAccounts();
    return mockAccounts.Patient;
  }

  function registerPatientAccount(account) {
    if (!account?.email || !account?.password) return null;

    var storedAccounts = readStoredPatientAccounts();
    var normalizedEmail = String(account.email).trim().toLowerCase();
    var nextAccount = {
      email: String(account.email).trim(),
      password: String(account.password).trim(),
      displayName: account.displayName || account.email,
      patientAdmissionId: account.patientAdmissionId || null,
      patientUhid: account.patientUhid || null,
    };

    var index = storedAccounts.findIndex(function (item) {
      return (
        item?.email?.toLowerCase() === normalizedEmail ||
        (nextAccount.patientUhid &&
          item?.patientUhid === nextAccount.patientUhid)
      );
    });

    if (index === -1) storedAccounts.unshift(nextAccount);
    else storedAccounts[index] = { ...storedAccounts[index], ...nextAccount };

    writeStoredPatientAccounts(storedAccounts);
    refreshMockAccounts();
    return nextAccount;
  }

  function getCurrentActor() {
    return sessionStorage.getItem(ACTOR_STORAGE_KEY) || "";
  }

  function getProfile(actor) {
    return actorProfiles[actor || getCurrentActor()] || null;
  }

  function loginAs(actor) {
    var profile = getProfile(actor);
    if (!profile) return null;

    sessionStorage.setItem(ACTOR_STORAGE_KEY, profile.actor);
    sessionStorage.setItem(ROLE_STORAGE_KEY, profile.accessRole);
    return profile;
  }

  function authenticate(actor, email, password) {
    var accounts =
      actor === "Patient" ? getPatientAccounts() : mockAccounts[actor] || [];
    var normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    var normalizedPassword = String(password || "").trim();
    var matched = accounts.find(function (account) {
      return (
        account.email.toLowerCase() === normalizedEmail &&
        account.password === normalizedPassword
      );
    });

    if (!matched) return null;

    var profile = loginAs(actor);
    if (!profile) return null;

    sessionStorage.setItem(AUTH_EMAIL_KEY, matched.email);
    sessionStorage.setItem(AUTH_NAME_KEY, matched.displayName || matched.email);

    if (matched.patientAdmissionId) {
      sessionStorage.setItem(
        "patientAdmissionId",
        String(matched.patientAdmissionId),
      );
    } else {
      sessionStorage.removeItem("patientAdmissionId");
    }

    if (matched.patientUhid) {
      sessionStorage.setItem(PATIENT_UHID_KEY, String(matched.patientUhid));
    } else {
      sessionStorage.removeItem(PATIENT_UHID_KEY);
    }

    return {
      actor: actor,
      profile: profile,
      account: matched,
    };
  }

  function logout() {
    sessionStorage.removeItem(ACTOR_STORAGE_KEY);
    sessionStorage.removeItem(ROLE_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_EMAIL_KEY);
    sessionStorage.removeItem(AUTH_NAME_KEY);
    sessionStorage.removeItem("patientAdmissionId");
    sessionStorage.removeItem(PATIENT_UHID_KEY);
  }

  function getAccessRole() {
    var storedRole = sessionStorage.getItem(ROLE_STORAGE_KEY);
    if (storedRole) return storedRole;

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
      window.location.href =
        settings.unauthenticatedRedirect ||
        getActorHome("", detectCurrentModule());
      return false;
    }

    if (hasModuleAccess(moduleName, currentActor)) return true;

    var fallbackUrl =
      settings.unauthorizedRedirect ||
      getActorHome(currentActor, detectCurrentModule());
    if (settings.alertMessage !== false) {
      alert(
        "Access Denied: " +
          currentActor +
          " cannot open the " +
          moduleName +
          " module.",
      );
    }
    window.location.href = fallbackUrl;
    return false;
  }

  window.RoleAccess = {
    profiles: actorProfiles,
    mockAccounts: mockAccounts,
    authenticate: authenticate,
    registerPatientAccount: registerPatientAccount,
    refreshMockAccounts: refreshMockAccounts,
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
  };
})();
