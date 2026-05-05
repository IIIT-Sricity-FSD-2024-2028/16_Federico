(function () {
  var ROOT_KEY = "HospitalAppState";
  var LEGACY_KEY = "hospitalFinanceAppState";

  function useSharedState() {
    return localStorage.getItem("USE_SHARED_STATE") === "true";
  }

  function resolveReadKey() {
    return ROOT_KEY;
  }

  function getState() {
    try {
      var raw = localStorage.getItem(resolveReadKey());
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function setState(newState) {
    var payload = JSON.stringify(newState || {});
    localStorage.setItem(ROOT_KEY, payload);
  }

  function getSlice(key, fallback) {
    var state = getState();
    return state[key] !== undefined ? state[key] : fallback;
  }

  window.HOMStorage = {
    ROOT_KEY: ROOT_KEY,
    LEGACY_KEY: LEGACY_KEY,
    useSharedState: useSharedState,
    getState: getState,
    setState: setState,
    getWards: function () { return getSlice("wards", []); },
    getPatients: function () { return getSlice("patients", []); },
    getPatientProfiles: function () { return getSlice("patientProfiles", {}); },
    getAdmissions: function () { return getSlice("admissions", {}); },
    getPendingAdmissions: function () { return getSlice("pendingAdmissions", []); },
    getBedRequests: function () { return getSlice("bedRequests", []); },
    getBedAllocations: function () { return getSlice("bedAllocations", []); },
  };
})();
