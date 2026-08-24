'use strict';

/**
 * shared/api-client.js — Modern REST Client with Reactive Cross-Tab Session Management.
 *
 * Provides a standardized REST interface against the Federico Express backend.
 * Session token is stored in localStorage under 'FedericoSession' and synchronized
 * across all open browser tabs via storage event listeners.
 */
(function () {
  var API_BASE_URL = window.__FEDERICO_API_URL__ || (
    typeof window !== "undefined" && window.location && window.location.port === "3000"
      ? window.location.origin
      : "http://localhost:3000"
  );
  var SESSION_KEY = "FedericoSession";
  var REQUEST_TIMEOUT_MS = 15000;

  // ---- Reactive Cross-Tab Session Storage ----
  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function setSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (_) {}
    window.dispatchEvent(new Event("federicoSessionChanged"));
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (_) {}
    window.dispatchEvent(new Event("federicoSessionChanged"));
  }

  // Synchronize auth state reactively when modified in another browser tab/window
  window.addEventListener("storage", function (e) {
    if (e.key === SESSION_KEY) {
      window.dispatchEvent(new Event("federicoSessionChanged"));
    }
  });

  // ---- Helpers ----
  function normalizePhone(phone) {
    var trimmed = String(phone || "").trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("+")) return trimmed;
    return "+91" + trimmed.replace(/\D/g, "");
  }

  function extractMessage(status, statusText, data) {
    if (data) {
      if (data.error && data.error.message) return data.error.message;
      if (Array.isArray(data.message)) return data.message.join(", ");
      if (data.message) return data.message;
    }
    return status + " " + statusText;
  }

  function withNormalizedPhones(payload, keys) {
    if (!payload || typeof payload !== "object") return payload;
    var copy = Object.assign({}, payload);
    keys.forEach(function (key) {
      if (copy[key]) copy[key] = normalizePhone(copy[key]);
    });
    return copy;
  }

  /**
   * Prevents double-submissions by locking a button element during in-flight async operations.
   */
  async function withAsyncLock(btnElement, asyncFn) {
    if (!btnElement) return asyncFn();
    if (btnElement.disabled || btnElement.dataset.loading === "true") return;
    btnElement.disabled = true;
    btnElement.dataset.loading = "true";
    var originalHtml = btnElement.innerHTML;
    try {
      return await asyncFn();
    } finally {
      btnElement.disabled = false;
      btnElement.dataset.loading = "false";
      btnElement.innerHTML = originalHtml;
    }
  }

  /**
   * Low-level fetch wrapper with bearer authentication, timeouts, and normalized error handling.
   */
  async function request(method, path, body, opts) {
    opts = opts || {};
    var session = getSession();
    var headers = { "Content-Type": "application/json" };
    if (session && session.token && opts.auth !== false) {
      headers["Authorization"] = "Bearer " + session.token;
    }

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

    var res;
    try {
      res = await fetch(API_BASE_URL + path, {
        method: method,
        headers: headers,
        credentials: "include",
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller ? controller.signal : undefined,
      });
    } catch (networkErr) {
      if (networkErr.name === "AbortError") {
        var timeoutErr = new Error("Request timed out after " + (REQUEST_TIMEOUT_MS / 1000) + "s. Please try again.");
        timeoutErr.status = 408;
        throw timeoutErr;
      }
      var offlineErr = new Error("Cannot reach the server. Is the backend running on " + API_BASE_URL + "?");
      offlineErr.status = 0;
      throw offlineErr;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
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
      if (res.status === 401 && opts.auth !== false) {
        clearSession();
      }
      var err = new Error(extractMessage(res.status, res.statusText, data));
      err.status = res.status;
      err.data = data;
      throw err;
    }

    // Unwrap standardized response envelope if present
    if (data && typeof data === "object" && "success" in data && "data" in data) {
      return data.data;
    }

    return data;
  }

  // ---- Public API Surface ----
  var Api = {
    BASE_URL: API_BASE_URL,
    withAsyncLock: withAsyncLock,

    // Session accessors — exposed so rbac.js and auth-guard.js can read/write
    // the session object without duplicating localStorage logic here.
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,

    auth: {
      login: async function (email, password, organizationId) {
        var body = { email: email, password: password };
        if (organizationId !== undefined && organizationId !== null) {
          body.organization_id = organizationId;
        }
        var payload = await request("POST", "/auth/login", body, { auth: false });
        if (payload && payload.token) {
          setSession({
            token: payload.token,
            userId: payload.user ? payload.user.user_id : null,
            email: payload.user ? payload.user.email : email,
            name: payload.user ? payload.user.name : null,
            role: payload.role || (payload.user ? payload.user.role : null),
            roleId: payload.user ? payload.user.role_id : null,
            organizationId: payload.organizationId || (payload.user ? payload.user.organization_id : null),
            hospitalId: payload.hospitalId || (payload.user ? payload.user.hospital_id : null),
            patientId: payload.patientId || (payload.patient ? payload.patient.patient_id : null),
            orgName: payload.orgName || (payload.organization ? payload.organization.organization_name : null),
            orgBranding: payload.orgBranding || null,
          });
        }
        return payload;
      },
      signup: async function (userData) {
        var payload = await request("POST", "/auth/signup", withNormalizedPhones(userData, ["phone"]), { auth: false });
        if (payload && payload.token) {
          setSession({
            token: payload.token,
            userId: payload.user ? payload.user.user_id : null,
            email: payload.user ? payload.user.email : userData.email,
            name: payload.user ? payload.user.name : userData.name,
            role: "Patient",
            roleId: 2,
            organizationId: payload.organizationId || userData.organization_id || 1,
            hospitalId: payload.hospitalId || userData.hospital_id || 1,
            patientId: payload.patientId || (payload.patient ? payload.patient.patient_id : null),
          });
        }
        return payload;
      },
      me: function () {
        return request("GET", "/auth/me");
      },
      logout: async function () {
        try {
          await request("POST", "/auth/logout");
        } catch (err) {}
        clearSession();
      },
    },

    marketplace: {
      organizations: function () {
        return request("GET", "/marketplace/organizations", undefined, { auth: false });
      },
      plans: function () {
        return request("GET", "/marketplace/plans", undefined, { auth: false });
      },
      registerOrganization: function (payload) {
        return request("POST", "/marketplace/register-organization", payload, { auth: false });
      },
    },

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
          } catch (err) {}
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
      portalSummary: function (id) {
        return request("GET", id ? "/patient/portal/summary/" + id : "/patient/portal/summary");
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
      bedsInWard: function (wardId) {
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
        update: function (id, patch) {
          return request("PUT", "/ward/bed-requests/" + id, patch);
        },
        // Convenience wrappers — HOM allocates a specific bed to a pending
        // request or denies it outright. Both map to the same PUT endpoint
        // but with different status payloads as the backend expects.
        allocate: function (requestId, bedId) {
          return request("PUT", "/ward/bed-requests/" + requestId, { status: "ALLOCATED", bed_id: bedId });
        },
        deny: function (requestId) {
          return request("PUT", "/ward/bed-requests/" + requestId, { status: "DENIED" });
        },
      },
      emergencies: {
        list: function () {
          return request("GET", "/ward/emergencies");
        },
        create: function (payload) {
          return request("POST", "/ward/emergencies", payload);
        },
        update: function (id, patch) {
          return request("PUT", "/ward/emergencies/" + id, patch);
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
        getByAdmission: function (admissionId) {
          return request("GET", "/billing/ledger/" + admissionId);
        },
        create: function (payload) {
          return request("POST", "/billing/ledger", payload);
        },
        listAll: function () {
          return request("GET", "/billing/ledgers");
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
      patient: {
        bills: function (patientId) {
          return request("GET", "/billing/patient/" + patientId + "/bills");
        },
        receipts: function (patientId) {
          return request("GET", "/billing/patient/" + patientId + "/receipts");
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
      receipts: {
        list: function () {
          return request("GET", "/billing/receipts");
        },
      },
      dischargeSummary: {
        getByAdmission: function (admissionId) {
          return request("GET", "/billing/discharge-summary/" + admissionId);
        },
        create: function (payload) {
          return request("POST", "/billing/discharge-summary", payload);
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
  // Alias — several portal scripts (Admin, HOM, PRE, FA) and login-page.js
  // reference `window.API`. Both names point at the same object so either works.
  window.API = Api;
})();
