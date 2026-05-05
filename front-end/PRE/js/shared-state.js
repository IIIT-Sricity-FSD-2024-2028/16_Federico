const LEGACY_STORAGE_KEY = "hospitalFinanceAppState";
const ROOT_STORAGE_KEY = "HospitalAppState";
const SHARED_STORAGE_KEY = ROOT_STORAGE_KEY;

/**
 * shared-state.js — PRE Module State Manager
 * All seed data is sourced exclusively from shared/canonical-seed.js
 * No hardcoded fallback data exists in this file.
 */

const CANONICAL_SHARED_SEED =
  window.CanonicalHospitalSeed?.buildSharedStateSeed?.() || null;

if (!CANONICAL_SHARED_SEED) {
  console.error(
    "[PRE/shared-state] canonical-seed.js not loaded. PRE state will be empty.",
  );
}

// Seed-sourced defaults — no inline fallback arrays
const DEFAULT_PRE_DOCTORS = CANONICAL_SHARED_SEED?.doctors || [];
const DEFAULT_PRE_REQUESTS = CANONICAL_SHARED_SEED?.preRequests || [];
const DEFAULT_BED_REQUESTS = CANONICAL_SHARED_SEED?.bedRequests || [];
const DEFAULT_BED_ALLOCATIONS = CANONICAL_SHARED_SEED?.bedAllocations || [];
const DEFAULT_EMERGENCY_NOTIFICATIONS =
  CANONICAL_SHARED_SEED?.emergencyNotifications || [];

// ==========================================
// CORE STATE I/O

function nextGeneratedId(namespace) {
  if (window.IDGenerator && typeof window.IDGenerator.nextId === "function") return window.IDGenerator.nextId(namespace);
  return `${namespace}-fallback`;
}

function nextNumericId(namespace) {
  const raw = String(nextGeneratedId(namespace));
  const value = Number(raw.split("-").pop());
  return Number.isFinite(value) ? value : Math.floor(Math.random() * 900000) + 1000;
}
// ==========================================

function readSharedState() {
  if (window.PREStateAdapter && typeof window.PREStateAdapter.getState === "function") return window.PREStateAdapter.getState();
  const raw = localStorage.getItem(SHARED_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveSharedState(state) {
  if (window.PREStateAdapter && typeof window.PREStateAdapter.setState === "function") {
    window.PREStateAdapter.setState(state);
  } else {
    const payload = JSON.stringify(state);
    localStorage.setItem(ROOT_STORAGE_KEY, payload);
  }

  // Immediate push to backend for real-time sync
  if (window.APIClient) {
    window.APIClient.pushFullState(state);
  }

  window.dispatchEvent(new Event("sharedStateUpdated"));
}

function bindSharedStateRefresh(callback) {
  if (typeof callback !== "function") return;

  window.addEventListener("storage", (event) => {
    if (event.key && event.key !== SHARED_STORAGE_KEY) return;
    callback();
  });

  window.addEventListener("sharedStateUpdated", callback);
}

// ==========================================
// LEGACY MIGRATION
// ==========================================

function migrateLegacyRequests(state) {
  let changed = false;
  const next = state && typeof state === "object" ? { ...state } : {};

  // Migrate old top-level preRequests format if needed
  if (Array.isArray(next._legacyPreRequests)) {
    next.preRequests = [
      ...(next.preRequests || []),
      ...next._legacyPreRequests,
    ];
    delete next._legacyPreRequests;
    changed = true;
  }

  return { state: next, changed };
}

// ==========================================
// SHAPE ENFORCEMENT
// ==========================================

function ensurePreState() {
  const migrated = migrateLegacyRequests(readSharedState());
  const state = migrated.state;
  let changed = migrated.changed;

  const legacyPatients = JSON.parse(localStorage.getItem("patients") || "[]");

  if (!Array.isArray(state.preRequests)) {
    state.preRequests = [];
    changed = true;
  }
  if (!Array.isArray(state.doctors)) {
    state.doctors = DEFAULT_PRE_DOCTORS.slice();
    changed = true;
  }
  if (!Array.isArray(state.pendingAdmissions)) {
    state.pendingAdmissions = [];
    changed = true;
  }
  if (!Array.isArray(state.bedRequests)) {
    state.bedRequests = [];
    changed = true;
  }
  if (!Array.isArray(state.bedAllocations)) {
    state.bedAllocations = [];
    changed = true;
  }
  if (!Array.isArray(state.emergencyNotifications)) {
    state.emergencyNotifications = [];
    changed = true;
  }
  if (!Array.isArray(state.patientDirectory)) {
    state.patientDirectory = [];
    changed = true;
  }
  if (!state.patientProfiles || typeof state.patientProfiles !== "object") {
    state.patientProfiles = {};
    changed = true;
  }
  if (!state.admissions || typeof state.admissions !== "object") {
    state.admissions = {};
    changed = true;
  }
  if (!Array.isArray(state.patients)) {
    state.patients = [];
    changed = true;
  }
  if (!Array.isArray(state.appointments)) {
    state.appointments = [];
    changed = true;
  }

  // Seed from canonical if empty
  if (state.preRequests.length === 0 && DEFAULT_PRE_REQUESTS.length > 0) {
    state.preRequests = DEFAULT_PRE_REQUESTS.slice();
    changed = true;
  }
  if (
    state.pendingAdmissions.length === 0 &&
    Array.isArray(CANONICAL_SHARED_SEED?.pendingAdmissions)
  ) {
    state.pendingAdmissions = CANONICAL_SHARED_SEED.pendingAdmissions.slice();
    changed = true;
  }
  if (state.bedRequests.length === 0 && DEFAULT_BED_REQUESTS.length > 0) {
    state.bedRequests = DEFAULT_BED_REQUESTS.slice();
    changed = true;
  }
  if (state.bedAllocations.length === 0 && DEFAULT_BED_ALLOCATIONS.length > 0) {
    state.bedAllocations = DEFAULT_BED_ALLOCATIONS.slice();
    changed = true;
  }
  if (
    state.emergencyNotifications.length === 0 &&
    DEFAULT_EMERGENCY_NOTIFICATIONS.length > 0
  ) {
    state.emergencyNotifications = DEFAULT_EMERGENCY_NOTIFICATIONS.slice();
    changed = true;
  }
  if (
    state.patients.length === 0 &&
    Array.isArray(CANONICAL_SHARED_SEED?.patients)
  ) {
    state.patients = CANONICAL_SHARED_SEED.patients.slice();
    changed = true;
  }
  if (
    Object.keys(state.admissions).length === 0 &&
    CANONICAL_SHARED_SEED?.admissions
  ) {
    state.admissions = { ...CANONICAL_SHARED_SEED.admissions };
    changed = true;
  }
  if (
    state.patientDirectory.length === 0 &&
    Array.isArray(CANONICAL_SHARED_SEED?.patientDirectory)
  ) {
    state.patientDirectory = CANONICAL_SHARED_SEED.patientDirectory.slice();
    changed = true;
  }
  if (
    Object.keys(state.patientProfiles).length === 0 &&
    CANONICAL_SHARED_SEED?.patientProfiles
  ) {
    state.patientProfiles = { ...CANONICAL_SHARED_SEED.patientProfiles };
    changed = true;
  }

  // Legacy patients migration
  if (
    state.patientDirectory.length === 0 &&
    Array.isArray(legacyPatients) &&
    legacyPatients.length > 0
  ) {
    state.patientDirectory = legacyPatients.slice();
    changed = true;
  }

  // Fill in any missing canonical seed records (by id) without overwriting existing ones
  const fillMissing = (stateArr, seedArr) => {
    if (!Array.isArray(seedArr) || seedArr.length === 0) return false;
    if (stateArr.length >= seedArr.length) return false;
    const existingIds = new Set(stateArr.map((item) => item.id));
    let added = false;
    seedArr.forEach((item) => {
      if (!existingIds.has(item.id)) {
        stateArr.push({ ...item });
        added = true;
      }
    });
    return added;
  };

  if (fillMissing(state.preRequests, DEFAULT_PRE_REQUESTS)) changed = true;
  if (fillMissing(state.bedRequests, DEFAULT_BED_REQUESTS)) changed = true;
  if (fillMissing(state.bedAllocations, DEFAULT_BED_ALLOCATIONS))
    changed = true;
  if (
    fillMissing(state.emergencyNotifications, DEFAULT_EMERGENCY_NOTIFICATIONS)
  )
    changed = true;

  if (changed) saveSharedState(state);
  return state;
}

// ==========================================
// PRE REQUESTS
// ==========================================

function getPreRequests() {
  return ensurePreState().preRequests || [];
}

function savePreRequests(requests) {
  const state = ensurePreState();
  state.preRequests = requests;
  saveSharedState(state);
}

// ==========================================
// DOCTORS
// ==========================================

function getSharedDoctors() {
  return ensurePreState().doctors || [];
}

function saveSharedDoctors(doctors) {
  const state = ensurePreState();
  state.doctors = doctors;
  saveSharedState(state);
}

// ==========================================
// BED REQUESTS & ALLOCATIONS
// ==========================================

function getBedRequests() {
  return ensurePreState().bedRequests || [];
}

function saveBedRequests(requests) {
  const state = ensurePreState();
  state.bedRequests = requests;
  saveSharedState(state);
}

function getBedAllocations() {
  return ensurePreState().bedAllocations || [];
}

function saveBedAllocations(allocations) {
  const state = ensurePreState();
  state.bedAllocations = allocations;
  saveSharedState(state);
}

// ==========================================
// EMERGENCY NOTIFICATIONS
// ==========================================

function getEmergencyNotifications() {
  return ensurePreState().emergencyNotifications || [];
}

function saveEmergencyNotifications(notifications) {
  const state = ensurePreState();
  state.emergencyNotifications = notifications;
  saveSharedState(state);
}

// ==========================================
// PATIENT DIRECTORY
// ==========================================

function getPatientDirectory() {
  return ensurePreState().patientDirectory || [];
}

function upsertPatientDirectoryEntry(entry) {
  const state = ensurePreState();
  const nextEntry = { ...entry };
  const index = state.patientDirectory.findIndex(
    (item) =>
      (nextEntry.id && item.id === nextEntry.id) ||
      (nextEntry.phone && item.phone === nextEntry.phone),
  );

  if (index === -1) state.patientDirectory.unshift(nextEntry);
  else
    state.patientDirectory[index] = {
      ...state.patientDirectory[index],
      ...nextEntry,
    };

  if (nextEntry.id) {
    const existingProfile = state.patientProfiles[nextEntry.id] || {};
    const parsedAge = Number.parseInt(String(nextEntry.age || existingProfile.age || "").replace(/[^\d]/g, ""), 10);
    const normalizedAge = Number.isFinite(parsedAge) ? parsedAge : (Number.isFinite(existingProfile.age) ? existingProfile.age : 0);
    const resolvedName = nextEntry.name || existingProfile.name || "";
    const firstName = resolvedName ? String(resolvedName).trim().split(/\s+/)[0] : "";
    const initials = resolvedName
      ? String(resolvedName).trim().split(/\s+/).filter(Boolean).map((part) => part[0].toUpperCase()).join("").slice(0, 2)
      : "";

    state.patientProfiles[nextEntry.id] = {
      ...existingProfile,
      id: existingProfile.id || (window.IdGen ? window.IdGen.nextId("USR") : nextGeneratedId("user")),
      firstName: existingProfile.firstName || firstName,
      initials: existingProfile.initials || initials,
      uhid: nextEntry.id,
      name: resolvedName,
      age: normalizedAge,
      gender:
        nextEntry.gender || existingProfile.gender || "",
      bloodGroup: existingProfile.bloodGroup || "Unknown",
      phone:
        nextEntry.phone || existingProfile.phone || "",
      email: existingProfile.email || "",
      address:
        nextEntry.address || existingProfile.address || "",
      dob: existingProfile.dob || "",
      insurance: {
        verified: Boolean(existingProfile.insurance?.verified),
        provider: existingProfile.insurance?.provider || "N/A",
        policyNumber: existingProfile.insurance?.policyNumber || "",
        memberId: existingProfile.insurance?.memberId || "",
        coverage: Number(existingProfile.insurance?.coverage || 0),
        validFrom: existingProfile.insurance?.validFrom || "",
        validTo: existingProfile.insurance?.validTo || "",
        coverageType: existingProfile.insurance?.coverageType || "Individual",
      },
    };
  }

  saveSharedState(state);
}

// ==========================================
// HOM COMMUNICATION
// ==========================================

function sendPreRequestToHOM(request, wardPreference, priority = "High") {
  const state = ensurePreState();
  const existing = (state.pendingAdmissions || []).find(
    (item) => item.pre_request_id === request.id,
  );

  if (existing) {
    existing.dept = request.department;
    existing.patient = request.name;
    existing.patient_id = request.patientId;
    existing.uhid = request.patientId;
    existing.priority = priority;
    existing.requestedBy = `PRE-${request.doctor || "Desk"}`;
    existing.preferredWard = wardPreference || existing.preferredWard || "";
    existing.patientDetails =
      request.patientDetails || existing.patientDetails || "";
    existing.updatedAt = Date.now();
  } else {
    state.pendingAdmissions.unshift({
      id: nextNumericId("pending-admission"),
      patient: request.name,
      patient_id: request.patientId,
      uhid: request.patientId,
      dept: request.department,
      requestedBy: `PRE-${request.doctor || "Desk"}`,
      priority,
      time: "Just now",
      pre_request_id: request.id,
      preferredWard: wardPreference || "",
      patientDetails: request.patientDetails || "",
      status: "Pending",
      updatedAt: Date.now(),
    });
  }

  saveSharedState(state);
}

function syncRequestToPatientAppointment(request) {
  const state = ensurePreState();
  const index = state.preRequests.findIndex(
    (item) =>
      item.id === request.id || item.appointmentId === request.appointmentId,
  );
  if (index === -1) return;

  state.preRequests[index] = { ...state.preRequests[index], ...request };
  saveSharedState(state);
}




