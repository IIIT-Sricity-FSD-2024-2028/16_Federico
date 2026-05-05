/**
 * patient-resolver.js
 * Unified patient profile resolver for Federico Hospital frontend.
 * Exposes window.PatientResolver globally.
 *
 * All functions accept the full app state object (not localStorage directly).
 * Resolves patient data across the three overlapping stores:
 *   - state.patientProfiles  (object keyed by uhid)
 *   - state.patientDirectory (array)
 *   - state.patients         (array)
 */
(function () {
  window.PatientResolver = {
    /**
     * Get a unified patient profile for the given uhid.
     * Tries patientProfiles first, then patientDirectory, then patients.
     * Returns null (never undefined) if no match is found.
     *
     * @param {string} uhid
     * @param {object} state - Full app state (e.g. from Store.get())
     * @returns {object|null}
     */
    getProfile: function (uhid, state) {
      if (!uhid || !state) return null;

      // 1. Try patientProfiles (keyed by uhid)
      var profiles = state.patientProfiles;
      if (profiles && typeof profiles === "object") {
        var profile = profiles[uhid];
        if (profile && profile.name) return profile;
      }

      // 2. Try patientDirectory (array)
      var directory = state.patientDirectory;
      if (Array.isArray(directory)) {
        for (var i = 0; i < directory.length; i++) {
          var entry = directory[i];
          if (entry && (entry.uhid === uhid || entry.id === uhid)) {
            return entry;
          }
        }
      }

      // 3. Try patients (array)
      var patients = state.patients;
      if (Array.isArray(patients)) {
        for (var j = 0; j < patients.length; j++) {
          var patient = patients[j];
          if (patient && patient.uhid === uhid) {
            return patient;
          }
        }
      }

      return null;
    },

    /**
     * Get the display name for a patient by uhid.
     * Falls back to returning the uhid itself so the UI never shows blank.
     *
     * @param {string} uhid
     * @param {object} state
     * @returns {string}
     */
    getName: function (uhid, state) {
      var profile = this.getProfile(uhid, state);
      if (profile && profile.name) return profile.name;
      return uhid || "";
    },

    /**
     * Get the age for a patient by uhid.
     * Falls back to "Unknown".
     *
     * @param {string} uhid
     * @param {object} state
     * @returns {string|number}
     */
    getAge: function (uhid, state) {
      var profile = this.getProfile(uhid, state);
      if (profile && profile.age !== undefined && profile.age !== null) {
        return profile.age;
      }
      return "Unknown";
    },

    /**
     * Find the first admission record for the given uhid.
     * Returns null if none found.
     *
     * @param {string} uhid
     * @param {object} state
     * @returns {object|null}
     */
    getAdmissionForUhid: function (uhid, state) {
      if (!uhid || !state) return null;
      var admissions = Object.values(state.admissions || {});
      for (var i = 0; i < admissions.length; i++) {
        if (admissions[i] && admissions[i].uhid === uhid) {
          return admissions[i];
        }
      }
      return null;
    },
  };
})();
