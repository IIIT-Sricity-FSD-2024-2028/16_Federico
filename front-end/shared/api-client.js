/**
 * shared/api-client.js — Phase 3 rewrite.
 *
 * Replaces the old localStorage-simulation bridge (which only merged 9 of
 * ~20 state slices and silently dropped the rest — the root cause of most
 * "broken workflow" bugs) with a direct REST client against the Express
 * backend, which is now the real source of truth. There is no more
 * full-state merge: every read goes to the backend, every write goes to
 * the backend, and localStorage is used only as a short-lived render
 * cache (see `shared/render-cache.js`), never as authority.
 *
 * Session (login token) is stored in `localStorage` (not `sessionStorage`)
 * under FEDERICO_SESSION_KEY so a logged-in actor stays logged in across
 * tabs/windows of the same browser — fixing the old per-tab session gap.
 */
(function () {
  var API_BASE_URL = "http://localhost:3000";
  var SESSION_KEY = "FedericoSession";

  // ---- session storage -----------------------------------------------

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function setSession(session) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (err) {}
    window.dispatchEvent(new Event("federicoSessionChanged"));
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch (err) {}
    window.dispatchEvent(new Event("federicoSessionChanged"));
  }

  // ---- helpers ----------------------------------------------------------

  /**
   * The backend's @IsPhoneNumber() validator requires international
   * format (a leading "+"). The demo dataset and forms are India-centric,
   * so a bare local number is assumed to be +91 unless the caller already
   * supplied a country code.
   */
  function normalizePhone(phone) {
    var trimmed = String(phone || "").trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("+")) return trimmed;
    return "+91" + trimmed.replace(/\D/g, "");
  }

  function extractMessage(status, statusText, data) {
    if (data) {
      if (Array.isArray(data.message)) return data.message.join(", ");
      if (data.message) return data.message;
    }
    return status + " " + statusText;
  }

  /**
   * Low-level request helper. Attaches the session Bearer token unless
   * `opts.auth === false`. On a 401 from an authenticated call, clears the
   * stale/expired session so the next guarded page load redirects to
   * login instead of looping on invalid-token errors.
   */
  async function request(method, path, body, opts) {
    opts = opts || {};
    var session = getSession();
    var headers = { "Content-Type": "application/json" };
    if (session && session.token && opts.auth !== false) {
      headers["Authorization"] = "Bearer " + session.token;
    }

    var res;
    try {
      res = await fetch(API_BASE_URL + path, {
        method: method,
        headers: headers,
        credentials: "include",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      var offlineErr = new Error("Cannot reach the server. Is the backend running on " + API_BASE_URL + "?");
      offlineErr.status = 0;
      throw offlineErr;
    }

    var text = await res.text();
    var data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        data = null;
      }
    }

    if (!res.ok) {
      if (res.status === 401 && opts.auth !== false) clearSession();
      var err = new Error(extractMessage(res.status, res.statusText, data));
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  }

  function withNormalizedPhones(payload, fields) {
    var out = Object.assign({}, payload);
    fields.forEach(function (field) {
      if (out[field]) out[field] = normalizePhone(out[field]);
    });
    return out;
  }

  // ---- API surface --------------------------------------------------

  var Api = {
    request: request,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    normalizePhone: normalizePhone,

    auth: {
      login: function (email, password, organizationId) {
        var body = { email: email, password: password };
        if (organizationId) body.organization_id = organizationId;
        return request("POST", "/auth/login", body, { auth: false });
      },
      signup: function (payload) {
        var body = withNormalizedPhones(payload, ["phone", "emergency_contact_phone"]);
        return request("POST", "/auth/signup", body, { auth: false });
      },
      me: function () {
        return request("GET", "/auth/me");
      },
      logout: async function () {
        try {
          await request("POST", "/auth/logout");
        } catch (err) {
          // best-effort — clear local session regardless
        }
        clearSession();
      },
    },

    // ---- Public organization marketplace (tasks.md §4) — no auth ----
    marketplace: {
      organizations: function () {
        return request("GET", "/marketplace/organizations", undefined, { auth: false });
      },
    },

    // ---- Platform Super User (separate session namespace) ----
    platform: {
      auth: {
        login: function (email, password) {
          return request("POST", "/platform/auth/login", { email: email, password: password }, { auth: false });
        },
        me: function () {
          return request("GET", "/platform/auth/me");
        },
        logout: async function () {
          try {
            await request("POST", "/platform/auth/logout");
          } catch (err) {
            // best-effort
          }
          clearSession();
        },
      },
      organizations: {
        list: function () {
          return request("GET", "/platform/organizations");
        },
        get: function (id) {
          return request("GET", "/platform/organizations/" + id);
        },
        provision: function (payload) {
          return request("POST", "/platform/organizations", payload);
        },
        suspend: function (id) {
          return request("PUT", "/platform/organizations/" + id + "/suspend");
        },
        activate: function (id) {
          return request("PUT", "/platform/organizations/" + id + "/activate");
        },
        remove: function (id) {
          return request("DELETE", "/platform/organizations/" + id);
        },
        provisioningLog: function (id) {
          return request("GET", "/platform/organizations/" + id + "/provisioning-log");
        },
        usage: function (id) {
          return request("GET", "/platform/organizations/" + id + "/usage");
        },
        hospitals: function (id) {
          return request("GET", "/platform/organizations/" + id + "/hospitals");
        },
        addHospital: function (id, payload) {
          return request("POST", "/platform/organizations/" + id + "/hospitals", payload);
        },
        modules: function (id) {
          return request("GET", "/platform/organizations/" + id + "/modules");
        },
        setModule: function (id, moduleCode, enabled) {
          return request("PUT", "/platform/organizations/" + id + "/modules/" + moduleCode, { enabled: enabled });
        },
        apiKeys: function (id) {
          return request("GET", "/platform/organizations/" + id + "/api-keys");
        },
        createApiKey: function (id, label) {
          return request("POST", "/platform/organizations/" + id + "/api-keys", { label: label });
        },
        getSubscription: function (id) {
          return request("GET", "/platform/organizations/" + id + "/subscription");
        },
        setSubscription: function (id, planId) {
          return request("PUT", "/platform/organizations/" + id + "/subscription", { plan_id: planId });
        },
        renewSubscription: function (id) {
          return request("PUT", "/platform/organizations/" + id + "/subscription/renew");
        },
      },
      apiKeys: {
        revoke: function (id) {
          return request("DELETE", "/platform/api-keys/" + id);
        },
      },
      plans: {
        list: function () {
          return request("GET", "/platform/plans");
        },
        create: function (payload) {
          return request("POST", "/platform/plans", payload);
        },
        update: function (id, patch) {
          return request("PUT", "/platform/plans/" + id, patch);
        },
      },
      usage: function () {
        return request("GET", "/platform/usage");
      },
      activityLog: function () {
        return request("GET", "/platform/activity-log");
      },
    },

    // ---- Org-scoped dynamic RBAC (custom roles) ----
    rbac: {
      roles: function () {
        return request("GET", "/rbac/roles");
      },
      createRole: function (payload) {
        return request("POST", "/rbac/roles", payload);
      },
      permissions: function () {
        return request("GET", "/rbac/permissions");
      },
      permissionsForRole: function (roleId) {
        return request("GET", "/rbac/roles/" + roleId + "/permissions");
      },
      assignPermission: function (roleId, permissionId) {
        return request("POST", "/rbac/roles/" + roleId + "/permissions", { permission_id: permissionId });
      },
      unassignPermission: function (roleId, permissionId) {
        return request("DELETE", "/rbac/roles/" + roleId + "/permissions/" + permissionId);
      },
      assignStaffRole: function (userId, customRoleId) {
        return request("POST", "/rbac/staff/" + userId + "/role", { custom_role_id: customRoleId });
      },
      unassignStaffRole: function (userId, customRoleId) {
        return request("DELETE", "/rbac/staff/" + userId + "/role/" + customRoleId);
      },
      staff: function () {
        return request("GET", "/rbac/staff");
      },
    },

    doctors: {
      list: function () {
        return request("GET", "/doctor");
      },
      get: function (id) {
        return request("GET", "/doctor/" + id);
      },
      create: function (payload) {
        return request("POST", "/doctor", withNormalizedPhones(payload, ["phone"]));
      },
      update: function (id, patch) {
        return request("PUT", "/doctor/" + id, patch);
      },
      remove: function (id) {
        return request("DELETE", "/doctor/" + id);
      },
      availabilityAll: function () {
        return request("GET", "/doctor/availability/all");
      },
      availabilityForDoctor: function (id) {
        return request("GET", "/doctor/" + id + "/availability");
      },
      createAvailability: function (payload) {
        return request("POST", "/doctor/availability", payload);
      },
    },

    patients: {
      list: function () {
        return request("GET", "/patient");
      },
      get: function (idOrUhid) {
        return request("GET", "/patient/" + idOrUhid);
      },
      create: function (payload) {
        return request("POST", "/patient", withNormalizedPhones(payload, ["phone", "alternate_phone", "emergency_contact_phone"]));
      },
      update: function (idOrUhid, patch) {
        return request("PUT", "/patient/" + idOrUhid, patch);
      },
      insuranceAll: function () {
        return request("GET", "/patient/insurance/all");
      },
      insuranceForPatient: function (id) {
        return request("GET", "/patient/" + id + "/insurance");
      },
      createInsurance: function (payload) {
        return request("POST", "/patient/insurance", payload);
      },
    },

    wards: {
      list: function () {
        return request("GET", "/ward");
      },
      create: function (payload) {
        return request("POST", "/ward", payload);
      },
      update: function (wardId, patch) {
        return request("PUT", "/ward/" + wardId, patch);
      },
      remove: function (wardId) {
        return request("DELETE", "/ward/" + wardId);
      },
      beds: function () {
        return request("GET", "/ward/beds");
      },
      bedsForWard: function (wardId) {
        return request("GET", "/ward/" + wardId + "/beds");
      },
      createBed: function (payload) {
        return request("POST", "/ward/bed", payload);
      },
      updateBedStatus: function (bedId, status) {
        return request("PUT", "/ward/bed/" + bedId, { status: status });
      },
      bedRequests: {
        list: function () {
          return request("GET", "/ward/bed-requests");
        },
        create: function (payload) {
          return request("POST", "/ward/bed-requests", payload);
        },
        allocate: function (id, bedId) {
          return request("PUT", "/ward/bed-requests/" + id, { bed_id: bedId });
        },
        deny: function (id) {
          return request("PUT", "/ward/bed-requests/" + id, { status: "DENIED" });
        },
      },
      emergency: {
        list: function () {
          return request("GET", "/ward/emergency");
        },
        create: function (payload) {
          return request("POST", "/ward/emergency", payload);
        },
        update: function (id, patch) {
          return request("PUT", "/ward/emergency/" + id, patch);
        },
      },
    },

    inventory: {
      items: {
        list: function () {
          return request("GET", "/inventory/items");
        },
        create: function (payload) {
          return request("POST", "/inventory/items", payload);
        },
        update: function (id, patch) {
          return request("PUT", "/inventory/items/" + id, patch);
        },
        remove: function (id) {
          return request("DELETE", "/inventory/items/" + id);
        },
      },
      requests: {
        list: function () {
          return request("GET", "/inventory/requests");
        },
        create: function (payload) {
          return request("POST", "/inventory/requests", payload);
        },
        update: function (id, patch) {
          return request("PUT", "/inventory/requests/" + id, patch);
        },
      },
    },

    billing: {
      services: {
        list: function () {
          return request("GET", "/billing/services");
        },
        create: function (payload) {
          return request("POST", "/billing/services", payload);
        },
      },
      ledger: {
        listAll: function () {
          return request("GET", "/billing/ledgers");
        },
        getByAdmission: function (admissionId) {
          return request("GET", "/billing/ledger/" + admissionId);
        },
        create: function (payload) {
          return request("POST", "/billing/ledger", payload);
        },
        entries: function (ledgerId) {
          return request("GET", "/billing/ledger/" + ledgerId + "/entries");
        },
        addEntry: function (payload) {
          return request("POST", "/billing/ledger/entry", payload);
        },
        dispatch: function (ledgerId) {
          return request("PUT", "/billing/ledger/" + ledgerId + "/dispatch");
        },
      },
      payments: {
        list: function () {
          return request("GET", "/billing/payments");
        },
        create: function (payload) {
          return request("POST", "/billing/payments", payload);
        },
      },
      dischargeSummary: {
        create: function (payload) {
          return request("POST", "/billing/discharge-summary", payload);
        },
        getByAdmission: function (admissionId) {
          return request("GET", "/billing/discharge-summary/" + admissionId);
        },
      },
      patient: {
        bills: function (patientId) {
          return request("GET", "/billing/patient/" + patientId + "/bills");
        },
        receipts: function (patientId) {
          return request("GET", "/billing/patient/" + patientId + "/receipts");
        },
      },
      receipts: {
        list: function () {
          return request("GET", "/billing/receipts");
        },
      },
      leaders: {
        list: function () {
          return request("GET", "/billing/leaders");
        },
        create: function (payload) {
          return request("POST", "/billing/leaders", payload);
        },
        approve: function (id) {
          return request("PUT", "/billing/leaders/" + id + "/approve");
        },
      },
    },

    appointments: {
      list: function () {
        return request("GET", "/appointment");
      },
      create: function (payload) {
        return request("POST", "/appointment", payload);
      },
      update: function (id, patch) {
        return request("PUT", "/appointment/" + id, patch);
      },
    },

    admissions: {
      list: function () {
        return request("GET", "/admission");
      },
      get: function (id) {
        return request("GET", "/admission/" + id);
      },
      create: function (payload) {
        return request("POST", "/admission", payload);
      },
      update: function (id, patch) {
        return request("PUT", "/admission/" + id, patch);
      },
    },

    preRequests: {
      list: function () {
        return request("GET", "/pre-requests");
      },
      get: function (id) {
        return request("GET", "/pre-requests/" + id);
      },
      create: function (payload) {
        return request("POST", "/pre-requests", payload);
      },
      update: function (id, patch) {
        return request("PUT", "/pre-requests/" + id, patch);
      },
    },

    activityLog: {
      list: function () {
        return request("GET", "/activity-log");
      },
    },
  };

  window.ApiClient = Api;
})();
