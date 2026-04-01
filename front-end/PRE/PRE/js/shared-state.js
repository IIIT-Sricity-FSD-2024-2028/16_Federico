const SHARED_STORAGE_KEY = "hospitalFinanceAppState";
const CANONICAL_SHARED_SEED = window.CanonicalHospitalSeed?.buildSharedStateSeed?.() || null;

const DEFAULT_PRE_DOCTORS = CANONICAL_SHARED_SEED?.doctors?.slice() || [
  { id: "D101", name: "Dr Qasim", specialization: "Cardiology", start: "9:00 AM", end: "1:00 PM", status: "Available" },
  { id: "D102", name: "Dr Kammran", specialization: "Orthopedics", start: "2:00 PM", end: "7:00 PM", status: "Available" },
  { id: "D103", name: "Dr Hamiz", specialization: "Neurology", start: "11:00 AM", end: "4:00 PM", status: "Not Available" },
  { id: "D104", name: "Dr Sachin", specialization: "Dermatology", start: "10:00 AM", end: "3:00 PM", status: "Available" }
];

const DEFAULT_PRE_REQUESTS = CANONICAL_SHARED_SEED?.preRequests?.slice() || [
  {
    id: "PRE-DEMO-1001",
    appointmentId: "PRE-APT-DEMO-1001",
    patientId: "FED-2026-9001",
    name: "Arun Mehta",
    age: "54",
    gender: "Male",
    phone: "9876543210",
    address: "Banjara Hills",
    department: "Cardiology",
    doctor: "",
    appointmentDate: "2026-04-05",
    bookedDate: "01/04/2026",
    appointmentTime: "",
    status: "Pending",
    visitType: "Admit",
    bedNumber: "",
    rejectReason: "",
    patientStatus: "",
    homStatus: ""
  },
  {
    id: "PRE-DEMO-1002",
    appointmentId: "PRE-APT-DEMO-1002",
    patientId: "FED-2026-9002",
    name: "Sunita Sharma",
    age: "43",
    gender: "Female",
    phone: "9123456780",
    address: "Secunderabad",
    department: "Surgery",
    doctor: "Dr Kammran",
    appointmentDate: "2026-04-04",
    bookedDate: "01/04/2026",
    appointmentTime: "11:30",
    status: "Approved",
    visitType: "Admit",
    bedNumber: "",
    rejectReason: "",
    patientStatus: "Approved",
    homStatus: ""
  },
  {
    id: "PRE-DEMO-1003",
    appointmentId: "PRE-APT-DEMO-1003",
    patientId: "FED-2026-9005",
    name: "Mohammed Ali",
    age: "38",
    gender: "Male",
    phone: "9988776655",
    address: "Kukatpally",
    department: "ICU",
    doctor: "Dr Hamiz",
    appointmentDate: "2026-04-03",
    bookedDate: "31/03/2026",
    appointmentTime: "09:00",
    status: "Emergency",
    visitType: "Emergency",
    bedNumber: "ER-07",
    rejectReason: "",
    patientStatus: "Emergency",
    homStatus: "HOM notified"
  },
  {
    id: "PRE-DEMO-1004",
    appointmentId: "PRE-APT-DEMO-1004",
    patientId: "FED-2026-9003",
    name: "Rajan Pillai",
    age: "52",
    gender: "Male",
    phone: "9012345678",
    address: "Madhapur",
    department: "General Medicine",
    doctor: "Dr Qasim",
    appointmentDate: "2026-04-02",
    bookedDate: "31/03/2026",
    appointmentTime: "14:00",
    status: "Admitted",
    visitType: "Admit",
    bedNumber: "IP-12",
    rejectReason: "",
    patientStatus: "Admitted",
    homStatus: "Bed confirmed"
  },
  {
    id: "PRE-DEMO-1005",
    appointmentId: "PRE-APT-DEMO-1005",
    patientId: "FED-2026-8904",
    name: "Lakshmi Devi",
    age: "45",
    gender: "Female",
    phone: "9090909090",
    address: "Ameerpet",
    department: "Orthopedics",
    doctor: "Dr Sachin",
    appointmentDate: "2026-04-01",
    bookedDate: "30/03/2026",
    appointmentTime: "16:15",
    status: "Discharge",
    visitType: "Consultation",
    bedNumber: "IP-04",
    rejectReason: "",
    patientStatus: "Discharge Pending",
    homStatus: "Awaiting HOM"
  },
  {
    id: "PRE-DEMO-1006",
    appointmentId: "PRE-APT-DEMO-1006",
    patientId: "FED-2026-9004",
    name: "Divya Nair",
    age: "36",
    gender: "Female",
    phone: "9345678901",
    address: "Jubilee Hills",
    department: "Pediatrics",
    doctor: "",
    appointmentDate: "2026-04-06",
    bookedDate: "01/04/2026",
    appointmentTime: "",
    status: "Rejected",
    visitType: "",
    bedNumber: "",
    rejectReason: "Doctor unavailable for requested slot",
    patientStatus: "",
    homStatus: ""
  }
];

const DEFAULT_BED_REQUESTS = CANONICAL_SHARED_SEED?.bedRequests?.slice() || [
  { id: "BED-DEMO-1", name: "Rajan Pillai", patientId: "FED-2026-9003", patientDetails: "Male, 52, General Medicine", status: "Pending" }
];

const DEFAULT_BED_ALLOCATIONS = CANONICAL_SHARED_SEED?.bedAllocations?.slice() || [
  { id: "ALLOC-DEMO-1", requestId: "BED-DEMO-1", name: "Rajan Pillai", patientId: "FED-2026-9003", patientDetails: "Male, 52, General Medicine", bed: "IP-12", status: "Allocated" }
];

const DEFAULT_EMERGENCY_NOTIFICATIONS = CANONICAL_SHARED_SEED?.emergencyNotifications?.slice() || [
  { id: "EMG-DEMO-1", patientId: "FED-2026-9005", bed: "ER-07", status: "Emergency", sentAt: "01/04/2026 10:00" }
];

function readSharedState() {
  const raw = localStorage.getItem(SHARED_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveSharedState(state) {
  localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("sharedStateUpdated"));
}

function bindSharedStateRefresh(callback) {
  if (typeof callback !== "function") return;

  window.addEventListener("storage", (event) => {
    if (event.key && event.key !== SHARED_STORAGE_KEY) return;
    callback();
  });

  window.addEventListener("sharedStateUpdated", callback);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    callback();
  });
}

function migrateLegacyRequests(state) {
  const legacy = JSON.parse(localStorage.getItem("requests")) || [];
  let changed = false;
  if (!Array.isArray(state.preRequests)) state.preRequests = [];

  legacy.forEach((request, index) => {
    const exists = state.preRequests.some((item) =>
      (item.legacyIndex === index) ||
      (item.patientId === request.patientId && item.appointmentDate === request.appointmentDate && item.department === request.department)
    );
    if (exists) return;

    state.preRequests.push({
      id: `PRE-${Date.now()}-${index}`,
      legacyIndex: index,
      appointmentId: request.appointmentId || null,
      patientId: request.patientId,
      name: request.name,
      age: request.age,
      gender: request.gender,
      phone: request.phone,
      address: request.address,
      department: request.department,
      doctor: request.doctor || "",
      appointmentDate: request.appointmentDate,
      bookedDate: request.bookedDate || "",
      appointmentTime: request.appointmentTime || request.time || "",
      status: request.status || "Pending",
      visitType: request.visitType || "",
      bedNumber: request.bedNumber || "",
      rejectReason: request.rejectReason || "",
      patientStatus: request.patientStatus || "",
      homStatus: request.homStatus || ""
    });
    changed = true;
  });

  return { state, changed };
}

function ensurePreState() {
  const migrated = migrateLegacyRequests(readSharedState());
  const state = migrated.state;
  let changed = migrated.changed;
  const legacyPatients = JSON.parse(localStorage.getItem("patients") || "[]");
  if (!Array.isArray(state.preRequests)) { state.preRequests = []; changed = true; }
  if (!Array.isArray(state.doctors)) { state.doctors = DEFAULT_PRE_DOCTORS.slice(); changed = true; }
  if (!Array.isArray(state.pendingAdmissions)) { state.pendingAdmissions = []; changed = true; }
  if (!Array.isArray(state.bedRequests)) { state.bedRequests = []; changed = true; }
  if (!Array.isArray(state.bedAllocations)) { state.bedAllocations = []; changed = true; }
  if (!Array.isArray(state.emergencyNotifications)) { state.emergencyNotifications = []; changed = true; }
  if (!Array.isArray(state.patientDirectory)) { state.patientDirectory = []; changed = true; }
  if (!state.patientProfiles || typeof state.patientProfiles !== "object") { state.patientProfiles = {}; changed = true; }
  if (!state.admissions || typeof state.admissions !== "object") { state.admissions = {}; changed = true; }
  if (!Array.isArray(state.patients)) { state.patients = []; changed = true; }

  if (state.preRequests.length === 0) { state.preRequests = DEFAULT_PRE_REQUESTS.slice(); changed = true; }
  if (state.pendingAdmissions.length === 0 && Array.isArray(CANONICAL_SHARED_SEED?.pendingAdmissions)) {
    state.pendingAdmissions = CANONICAL_SHARED_SEED.pendingAdmissions.slice();
    changed = true;
  }
  if (state.bedRequests.length === 0) { state.bedRequests = DEFAULT_BED_REQUESTS.slice(); changed = true; }
  if (state.bedAllocations.length === 0) { state.bedAllocations = DEFAULT_BED_ALLOCATIONS.slice(); changed = true; }
  if (state.emergencyNotifications.length === 0) { state.emergencyNotifications = DEFAULT_EMERGENCY_NOTIFICATIONS.slice(); changed = true; }
  if (state.patients.length === 0 && Array.isArray(CANONICAL_SHARED_SEED?.patients)) {
    state.patients = CANONICAL_SHARED_SEED.patients.slice();
    changed = true;
  }
  if (Object.keys(state.admissions).length === 0 && CANONICAL_SHARED_SEED?.admissions) {
    state.admissions = { ...CANONICAL_SHARED_SEED.admissions };
    changed = true;
  }
  if (state.patientDirectory.length === 0 && Array.isArray(CANONICAL_SHARED_SEED?.patientDirectory)) {
    state.patientDirectory = CANONICAL_SHARED_SEED.patientDirectory.slice();
    changed = true;
  }
  if (Object.keys(state.patientProfiles).length === 0 && CANONICAL_SHARED_SEED?.patientProfiles) {
    state.patientProfiles = { ...CANONICAL_SHARED_SEED.patientProfiles };
    changed = true;
  }
  if (state.patientDirectory.length === 0 && Array.isArray(legacyPatients) && legacyPatients.length > 0) {
    state.patientDirectory = legacyPatients.slice();
    changed = true;
  }

  if (changed) saveSharedState(state);
  return state;
}

function getPreRequests() {
  return ensurePreState().preRequests || [];
}

function savePreRequests(requests) {
  const state = ensurePreState();
  state.preRequests = requests;
  saveSharedState(state);
}

function getSharedDoctors() {
  return ensurePreState().doctors || [];
}

function saveSharedDoctors(doctors) {
  const state = ensurePreState();
  state.doctors = doctors;
  saveSharedState(state);
}

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

function getEmergencyNotifications() {
  return ensurePreState().emergencyNotifications || [];
}

function saveEmergencyNotifications(notifications) {
  const state = ensurePreState();
  state.emergencyNotifications = notifications;
  saveSharedState(state);
}

function getPatientDirectory() {
  return ensurePreState().patientDirectory || [];
}

function upsertPatientDirectoryEntry(entry) {
  const state = ensurePreState();
  const nextEntry = { ...entry };
  const index = state.patientDirectory.findIndex((item) =>
    (nextEntry.id && item.id === nextEntry.id) ||
    (nextEntry.phone && item.phone === nextEntry.phone)
  );

  if (index === -1) state.patientDirectory.unshift(nextEntry);
  else state.patientDirectory[index] = { ...state.patientDirectory[index], ...nextEntry };

  if (nextEntry.id) {
    state.patientProfiles[nextEntry.id] = {
      ...(state.patientProfiles[nextEntry.id] || {}),
      uhid: nextEntry.id,
      name: nextEntry.name || state.patientProfiles[nextEntry.id]?.name || "",
      age: nextEntry.age || state.patientProfiles[nextEntry.id]?.age || "",
      gender: nextEntry.gender || state.patientProfiles[nextEntry.id]?.gender || "",
      phone: nextEntry.phone || state.patientProfiles[nextEntry.id]?.phone || "",
      address: nextEntry.address || state.patientProfiles[nextEntry.id]?.address || ""
    };
  }

  saveSharedState(state);
}

function sendPreRequestToHOM(request, wardPreference, priority = "High") {
  const state = ensurePreState();
  const existing = (state.pendingAdmissions || []).find((item) => item.pre_request_id === request.id);
  if (existing) {
    existing.dept = request.department;
    existing.patient = request.name;
    existing.patient_id = request.patientId;
    existing.uhid = request.patientId;
    existing.priority = priority;
    existing.requestedBy = `PRE-${request.doctor || "Desk"}`;
    existing.preferredWard = wardPreference || existing.preferredWard || "";
    existing.patientDetails = request.patientDetails || existing.patientDetails || "";
    existing.updatedAt = Date.now();
  } else {
    state.pendingAdmissions.unshift({
      id: Date.now(),
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
      updatedAt: Date.now()
    });
  }

  saveSharedState(state);
}

function syncRequestToPatientAppointment(request) {
  const state = ensurePreState();
  const index = state.preRequests.findIndex((item) => item.id === request.id || item.appointmentId === request.appointmentId);
  if (index === -1) return;

  state.preRequests[index] = { ...state.preRequests[index], ...request };
  saveSharedState(state);
}
