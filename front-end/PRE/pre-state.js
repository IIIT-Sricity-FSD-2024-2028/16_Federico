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

  window.PREStateAdapter = {
    ROOT_KEY: ROOT_KEY,
    LEGACY_KEY: LEGACY_KEY,
    useSharedState: useSharedState,
    getState: getState,
    setState: setState,
  };
})();
