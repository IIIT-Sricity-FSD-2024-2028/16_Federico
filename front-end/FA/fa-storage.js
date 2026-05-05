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

    // Immediate push to backend for real-time sync
    if (window.APIClient) {
      window.APIClient.pushFullState(newState);
    }
  }

  function getSlice(key, fallback) {
    var state = getState();
    return state[key] !== undefined ? state[key] : fallback;
  }

  window.FAStorage = {
    ROOT_KEY: ROOT_KEY,
    LEGACY_KEY: LEGACY_KEY,
    useSharedState: useSharedState,
    getState: getState,
    setState: setState,
    getAdmissions: function () { return getSlice("admissions", {}); },
    getLedgers: function () { return getSlice("ledgers", {}); },
    getServiceRequests: function () { return getSlice("serviceRequests", []); },
    getFaLedgerRequests: function () { return getSlice("faLedgerRequests", []); },
    getDispatchQueue: function () { return getSlice("dispatchQueue", []); },
    getReceipts: function () { return getSlice("receipts", []); },
  };
})();
