



let appointmentPatientCatalog = [];

function nextGeneratedId(namespace) {
  if (window.IDGenerator && typeof window.IDGenerator.nextId === "function") return window.IDGenerator.nextId(namespace);
  return `${namespace}-fallback`;
}
let appointmentPickerOpen = false;
let selectedAppointmentPatient = null;

//  ERROR
function showError(msg) {
  document.getElementById("errorMsg").innerText = msg;
}
function showPopupError(msg) {
  document.getElementById("popupError").innerText = msg;
}
function clearError() {
  document.getElementById("errorMsg").innerText = "";
}
function clearPopupError() {
  document.getElementById("popupError").innerText = "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

//VALIDATION -
function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

function isValidAge(age) {
  return /^[1-9]\d*$/.test(String(age || "").trim());
}

function isValidPatientName(name) {
  return /^[A-Za-z\s.'-]+$/.test(String(name || "").trim());
}

function sanitizePatientName(value) {
  return String(value || "").replace(/[^A-Za-z\s.'-]/g, "");
}

function sanitizeAge(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function handleNameInput(inputId, errorRenderer, clearRenderer) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", () => {
    const originalValue = input.value;
    const sanitizedValue = sanitizePatientName(originalValue);

    if (originalValue !== sanitizedValue) {
      input.value = sanitizedValue;
      errorRenderer("Name should contain letters only");
      return;
    }

    if (!input.value.trim()) {
      clearRenderer();
      return;
    }

    if (!isValidPatientName(input.value)) {
      errorRenderer("Name should contain letters only");
      return;
    }

    clearRenderer();
  });
}

function handleAgeInput(inputId, errorRenderer, clearRenderer) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", () => {
    const originalValue = input.value;
    const sanitizedValue = sanitizeAge(originalValue);

    if (originalValue !== sanitizedValue) {
      input.value = sanitizedValue;
      errorRenderer("Age only number");
      return;
    }

    if (!input.value.trim()) {
      clearRenderer();
      return;
    }

    if (!isValidAge(input.value)) {
      errorRenderer("Enter age as a positive integer only");
      return;
    }

    clearRenderer();
  });
}

function buildSharedPatientCatalog() {
  const sharedState = typeof ensurePreState === "function" ? ensurePreState() : {};
  const catalog = new Map();

  function mergePatient(raw) {
    const patientId = raw?.patientId || raw?.uhid || raw?.id || "";
    const name = raw?.name || raw?.patient || raw?.patient_name || "";
    if (!patientId || !name) return;

    const existing = catalog.get(patientId) || {};
    const merged = {
      patientId,
      name,
      age: raw?.age || existing.age || "",
      gender: raw?.gender || existing.gender || "",
      phone: raw?.phone || existing.phone || "",
      address: raw?.address || existing.address || "",
      department: raw?.department || raw?.dept || existing.department || "",
      status: raw?.status || raw?.patientStatus || raw?.homStatus || existing.status || ""
    };

    catalog.set(patientId, merged);
  }

  (sharedState.patientDirectory || []).forEach((item) => mergePatient(item));
  (sharedState.preRequests || []).forEach((item) => mergePatient(item));
  (sharedState.pendingAdmissions || []).forEach((item) => mergePatient(item));
  (sharedState.patients || []).forEach((item) => mergePatient(item));
  Object.entries(sharedState.patientProfiles || {}).forEach(([patientId, profile]) => {
    mergePatient({ id: patientId, ...profile });
  });
  Object.values(sharedState.admissions || {}).forEach((admission) => {
    mergePatient({
      uhid: admission.uhid,
      name: admission.patient_name,
      address: admission.address || ""
    });
  });

  return Array.from(catalog.values()).sort((left, right) => {
    return left.name.localeCompare(right.name) || left.patientId.localeCompare(right.patientId);
  });
}

function getAppointmentPickerElements() {
  return {
    picker: document.getElementById("appointmentPatientPicker"),
    dropdown: document.getElementById("appointmentPatientDropdown"),
    patientIdInput: document.getElementById("patientId")
  };
}

function setAppointmentPickerVisibility(isVisible) {
  const { picker, dropdown } = getAppointmentPickerElements();
  if (!picker || !dropdown) return;

  appointmentPickerOpen = isVisible;
  dropdown.hidden = !isVisible;
  picker.classList.toggle("is-open", isVisible);
}

function fillPatientForm(patient) {
  selectedAppointmentPatient = { ...patient };
  document.getElementById("patientId").value = patient.patientId || "";
  document.getElementById("patientName").value = patient.name || "";
  document.getElementById("age").value = patient.age || "";
  document.getElementById("gender").value = patient.gender || "";
  document.getElementById("phone").value = patient.phone || "";
  document.getElementById("address").value = patient.address || "";
}

function renderAppointmentPatientDropdown(query = "") {
  const { dropdown } = getAppointmentPickerElements();
  if (!dropdown) return;

  appointmentPatientCatalog = buildSharedPatientCatalog();
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const matches = appointmentPatientCatalog.filter((patient) => {
    if (!normalizedQuery) return true;
    const haystack = [
      patient.patientId,
      patient.name,
      patient.phone,
      patient.department,
      patient.status
    ].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  if (matches.length === 0) {
    dropdown.innerHTML = `
      <div class="appointment-picker-empty">
        <strong>No shared patients found</strong>
        <span>Create a new patient or try another ID.</span>
      </div>
    `;
    setAppointmentPickerVisibility(true);
    return;
  }

  dropdown.innerHTML = matches.map((patient) => `
    <button
      type="button"
      class="appointment-picker-option"
      data-patient-id="${escapeHtml(patient.patientId)}"
    >
      <div class="appointment-picker-row">
        <strong>${escapeHtml(patient.patientId)}</strong>
        <span>${escapeHtml(patient.status || "Shared")}</span>
      </div>
      <div class="appointment-picker-row appointment-picker-meta">
        <span>${escapeHtml(patient.name)}</span>
        <span>${escapeHtml(patient.phone || "No phone")}</span>
      </div>
    </button>
  `).join("");

  dropdown.querySelectorAll(".appointment-picker-option").forEach((button) => {
    button.addEventListener("click", () => {
      const patient = appointmentPatientCatalog.find((item) => item.patientId === button.dataset.patientId);
      if (!patient) return;
      fillPatientForm(patient);
      setAppointmentPickerVisibility(false);
      clearError();
    });
  });

  setAppointmentPickerVisibility(true);
}

function bindAppointmentPatientPicker() {
  const { picker, patientIdInput } = getAppointmentPickerElements();
  if (!picker || !patientIdInput) return;

  appointmentPatientCatalog = buildSharedPatientCatalog();

  patientIdInput.addEventListener("focus", () => {
    renderAppointmentPatientDropdown(patientIdInput.value);
  });

  patientIdInput.addEventListener("click", () => {
    renderAppointmentPatientDropdown(patientIdInput.value);
  });

  patientIdInput.addEventListener("input", () => {
    if (selectedAppointmentPatient && patientIdInput.value.trim() !== selectedAppointmentPatient.patientId) {
      selectedAppointmentPatient = null;
    }
    renderAppointmentPatientDropdown(patientIdInput.value);
  });

  patientIdInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setAppointmentPickerVisibility(false);
  });

  document.addEventListener("click", (event) => {
    if (!picker.contains(event.target)) setAppointmentPickerVisibility(false);
  });
}

function bindAppointmentFormFieldBehavior() {
  const nonPickerFieldIds = [
    "searchPhone",
    "patientName",
    "age",
    "gender",
    "phone",
    "appointmentDate",
    "department",
    "address",
    "newName",
    "newAge",
    "newGender",
    "newPhone",
    "newAddress"
  ];

  nonPickerFieldIds.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.addEventListener("focus", () => {
      setAppointmentPickerVisibility(false);
    });

    if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
      field.setAttribute("autocomplete", "off");
    }
  });
}

function refreshAppointmentPicker() {
  appointmentPatientCatalog = buildSharedPatientCatalog();
  const { patientIdInput } = getAppointmentPickerElements();

  if (selectedAppointmentPatient?.patientId) {
    const refreshed = appointmentPatientCatalog.find((item) => item.patientId === selectedAppointmentPatient.patientId);
    if (refreshed) fillPatientForm(refreshed);
  }

  if (appointmentPickerOpen || document.activeElement === patientIdInput) {
    renderAppointmentPatientDropdown(patientIdInput?.value || "");
  }
}

function findSharedPatientById(patientId) {
  appointmentPatientCatalog = buildSharedPatientCatalog();
  return appointmentPatientCatalog.find((item) => item.patientId === patientId) || null;
}

// ---------------- SEARCH PATIENT ----------------
function searchPatient() {
  clearError();

  let phone = document.getElementById("searchPhone").value.trim();

  if (!isValidPhone(phone)) {
    showError("Enter valid 10 digit phone");
    return;
  }

  let found = buildSharedPatientCatalog().find((patient) => patient.phone === phone);

  if (found) {
    fillPatientForm(found);
    setAppointmentPickerVisibility(false);
    openSearchResultPopup(found);
  } else {
    showError("Patient not found");
  }
}

// ---------------- POPUP ----------------
function openPatientPopup() {
  clearPopupError();
  document.getElementById("patientPopup").style.display = "flex";
}
function closePatientPopup() {
  document.getElementById("patientPopup").style.display = "none";
}

function openSearchResultPopup(patient) {
  const popup = document.getElementById("searchResultPopup");
  const patientId = document.getElementById("searchResultPatientId");
  const patientName = document.getElementById("searchResultPatientName");
  if (!popup || !patientId || !patientName) return;

  patientId.innerText = patient.patientId || "-";
  patientName.innerText = patient.name || "-";
  popup.style.display = "flex";
}

function closeSearchResultPopup() {
  const popup = document.getElementById("searchResultPopup");
  if (popup) popup.style.display = "none";
}

// ---------------- SUCCESS ----------------
function showSuccess(msg) {
  document.getElementById("successMsg").innerText = msg;
  document.getElementById("successPopup").style.display = "flex";
}
function closeSuccess() {
  document.getElementById("successPopup").style.display = "none";
}

// ---------------- ID ----------------
function generateID(prefix) {
  if (prefix === "PID") {
    return nextGeneratedId("patient");
  }
  return nextGeneratedId(prefix.toLowerCase());
}

// ---------------- REGISTER PATIENT ----------------
function registerPatient() {
  clearPopupError();

  let name = document.getElementById("newName").value.trim();
  let age = document.getElementById("newAge").value.trim();
  let gender = document.getElementById("newGender").value;
  let phone = document.getElementById("newPhone").value.trim();
  let address = document.getElementById("newAddress").value.trim();

  if (!name || !age || !gender || !phone || !address) {
    showPopupError("Please fill all required fields");
    return;
  }

  if (!isValidPatientName(name)) {
    showPopupError("Name should contain letters only");
    return;
  }

  if (!isValidAge(age)) {
    showPopupError("Enter age as a positive integer only");
    return;
  }

  if (!isValidPhone(phone)) {
    showPopupError("Phone must be 10 digits");
    return;
  }

  let id = generateID("PID");

  let patient = { id, name, age, gender, phone, address };
  upsertPatientDirectoryEntry(patient);

  fillPatientForm({
    patientId: id,
    name,
    age,
    gender,
    phone,
    address
  });

  document.getElementById("newName").value = "";
  document.getElementById("newAge").value = "";
  document.getElementById("newGender").value = "";
  document.getElementById("newPhone").value = "";
  document.getElementById("newAddress").value = "";

  refreshAppointmentPicker();
  closePatientPopup();
  showSuccess("Patient created successfully");
}

// ---------------- CREATE APPOINTMENT ----------------
function createAppointment() {
  clearError();

  let patientId = document.getElementById("patientId").value.trim();
  let sharedPatient = selectedAppointmentPatient || findSharedPatientById(patientId);
  let name = document.getElementById("patientName").value.trim() || sharedPatient?.name || "";
  let age = document.getElementById("age").value.trim() || sharedPatient?.age || "";
  let gender = document.getElementById("gender").value || sharedPatient?.gender || "";
  let phone = document.getElementById("phone").value.trim() || sharedPatient?.phone || "";
  let address = document.getElementById("address").value.trim() || sharedPatient?.address || "";
  let appointmentDate = document.getElementById("appointmentDate").value;
  let department = document.getElementById("department").value;
  let visitType = document.getElementById("visitType")?.value || "Consultation";

  document.getElementById("patientName").value = name;
  document.getElementById("age").value = age;
  document.getElementById("gender").value = gender;
  document.getElementById("phone").value = phone;
  document.getElementById("address").value = address;

  if (!patientId || !name || !age || !gender || !phone || !address || !appointmentDate || !department) {
    showError("Please fill all required fields");
    return;
  }

  if (!isValidPatientName(name)) {
    showError("Name should contain letters only");
    return;
  }

  if (!isValidAge(age)) {
    showError("Enter age as a positive integer only");
    return;
  }

  if (!isValidPhone(phone)) {
    showError("Phone must be 10 digits");
    return;
  }

  let request = {
    id: nextGeneratedId("pre-request"),
    appointmentId: nextGeneratedId("pre-appointment"),
    patientId,
    name,
    age,
    gender,
    phone,
    address,
    appointmentDate,
    bookedDate: new Date().toLocaleDateString("en-IN"),
    appointmentTime: "",
    doctor: "",
    department,
    status: "Pending",
    source: "PRE",
    visitType,
    patientStatus: "Pending",
    homStatus: "Awaiting HOM",
    bedNumber: "",
    rejectReason: "",
    patientDetails: `${gender}, ${age}, ${department}`,
    wardType: "General Ward",
    decided_at: 0,
    updated_at: Date.now()
  };
  let requests = getPreRequests();
  requests.unshift(request);
  savePreRequests(requests);
  upsertPatientDirectoryEntry({ id: patientId, name, age, gender, phone, address });

  showSuccess("Appointment created successfully");

  document.getElementById("patientId").value = "";
  document.getElementById("patientName").value = "";
  document.getElementById("age").value = "";
  document.getElementById("gender").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("address").value = "";
  document.getElementById("appointmentDate").value = "";
  document.getElementById("department").value = "";
  const visitTypeField = document.getElementById("visitType");
  if (visitTypeField) visitTypeField.value = "Consultation";
  selectedAppointmentPatient = null;
  setAppointmentPickerVisibility(false);
  refreshAppointmentPicker();
}

document.addEventListener("DOMContentLoaded", () => {
  const appointmentDateInput = document.getElementById("appointmentDate");
  const ageInput = document.getElementById("age");
  const newAgeInput = document.getElementById("newAge");
  if (appointmentDateInput) {
    appointmentDateInput.min = new Date().toISOString().split("T")[0];
  }
  if (ageInput) {
    ageInput.min = "1";
    ageInput.step = "1";
  }
  if (newAgeInput) {
    newAgeInput.min = "1";
    newAgeInput.step = "1";
  }

  handleNameInput("patientName", showError, clearError);
  handleNameInput("newName", showPopupError, clearPopupError);
  handleAgeInput("age", showError, clearError);
  handleAgeInput("newAge", showPopupError, clearPopupError);

  bindAppointmentPatientPicker();
  bindAppointmentFormFieldBehavior();
  refreshAppointmentPicker();
});

bindSharedStateRefresh(() => {
  refreshAppointmentPicker();
});


