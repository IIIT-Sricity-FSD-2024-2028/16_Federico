/**
 * id-generator.js
 * Shared monotonic ID generator for Federico Hospital frontend.
 * Exposes window.IdGen globally.
 *
 * Usage:
 *   IdGen.nextId("ADM")      → "ADM-00001", "ADM-00002", ...
 *   IdGen.seed("ADM", 700)   → sets ADM counter to 700, next call returns "ADM-00701"
 *
 * Counters are in-memory only. Not persisted to localStorage.
 */
(function () {
  var counters = {};

  window.IdGen = {
    /**
     * Increment the counter for the given namespace and return a formatted ID.
     * Format: NAMESPACE-00000 (namespace uppercased, counter zero-padded to 5 digits).
     * @param {string} namespace
     * @returns {string}
     */
    nextId: function (namespace) {
      var ns = String(namespace || "ID").toUpperCase();
      if (!counters[ns] || typeof counters[ns] !== "number") {
        counters[ns] = 0;
      }
      counters[ns] += 1;
      var padded = String(counters[ns]).padStart(5, "0");
      return ns + "-" + padded;
    },

    /**
     * Seed the counter for a namespace to a given integer value.
     * The next call to nextId(namespace) will return startValue + 1.
     * @param {string} namespace
     * @param {number} startValue
     */
    seed: function (namespace, startValue) {
      var ns = String(namespace || "ID").toUpperCase();
      counters[ns] = Number(startValue) || 0;
    },
  };

  // Also expose as window.IDGenerator for backward compatibility with existing
  // helper functions in storage.js, shared-state.js, and billing.js that
  // call window.IDGenerator.nextId(). This delegates directly to IdGen.
  window.IDGenerator = {
    nextId: function (namespace) {
      return window.IdGen.nextId(namespace);
    },
  };
})();
