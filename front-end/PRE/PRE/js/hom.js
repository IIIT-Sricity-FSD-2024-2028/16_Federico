const HOM_WARD_OPTIONS = [
  "General Ward",
  "ICU Ward",
  "Emergency Ward",
  "Surgical Ward",
  "Pediatric Ward",
  "Maternity Ward",
  "Cardiac Care Ward"
];

let homPatientCatalog = [];
let homPickerOpen = false;
let selectedPatientRecord = null;

function showMessage(msg, color = "green") {
  const box = document.getElementById("msgBox");
  if (!box) return;

  box.innerText = msg;
  box.style.backgroundColor = color;
  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inferWardType(record) {
  const existingWard = record?.wardType || record?.preferredWard || "";
  if (existingWard) return existingWard;

  const department = String(record?.department || record?.dept || record?.visitType || "").toLowerCase();

  if (department.includes("icu")) return "ICU Ward";
  if (department.includes("emergency")) return "Emergency Ward";
  if (department.includes("pediatric")) return "Pediatric Ward";
  if (department.includes("maternity") || department.includes("obstetric") || department.includes("gyn")) return "Maternity Ward";
  if (department.includes("surgery") || department.includes("surgical") || department.includes("ortho")) return "Surgical Ward";
  if (department.includes("card")) return "Cardiac Care Ward";
  return "General Ward";
}

function buildPatientDetails(record) {
  if (record?.patientDetails) return record.patientDetails;

  const parts = [
    record?.gender || "",
    record?.age || "",
    record?.department || record?.dept || "",
    record?.doctor ? `Doctor: ${record.doctor}` : ""
  ].filter(Boolean);

  return parts.join(", ");
}

function mergePatientCandidate(map, raw) {
  const patientId = raw?.patientId || raw?.uhid || raw?.id || "";
  const name = raw?.name || raw?.patient || raw?.fullName || "";
  if (!patientId || !name) return;

  const existing = map.get(patientId) || {};
  const merged = {
    patientId,
    name,
    age: raw?.age || existing.age || "",
    gender: raw?.gender || existing.gender || "",
    department: raw?.department || raw?.dept || existing.department || "",
    doctor: raw?.doctor || existing.doctor || "",
    phone: raw?.phone || existing.phone || "",
    address: raw?.address || existing.address || "",
    patientDetails: raw?.patientDetails || existing.patientDetails || "",
    wardType: raw?.wardType || raw?.preferredWard || existing.wardType || "",
    status: raw?.status || raw?.patientStatus || raw?.homStatus || existing.status || "",
    source: raw?.source || existing.source || "Shared"
  };

  if (!merged.patientDetails) merged.patientDetails = buildPatientDetails(merged);
  if (!merged.wardType) merged.wardType = inferWardType(merged);

  map.set(patientId, merged);
}

function buildPatientCatalog() {
  const catalog = new Map();
  const sharedState = typeof readSharedState === "function" ? readSharedState() : {};

  (getPatientDirectory() || []).forEach((item) => mergePatientCandidate(catalog, item));
  (getPreRequests() || []).forEach((item) => mergePatientCandidate(catalog, item));
  (sharedState.pendingAdmissions || []).forEach((item) => mergePatientCandidate(catalog, item));
  (sharedState.patients || []).forEach((item) => mergePatientCandidate(catalog, item));

  return Array.from(catalog.values()).sort((left, right) => {
    return left.name.localeCompare(right.name) || left.patientId.localeCompare(right.patientId);
  });
}

function getPatientPickerElements() {
  return {
    picker: document.getElementById("patientPicker"),
    dropdown: document.getElementById("patientListDropdown"),
    nameInput: document.getElementById("name"),
    patientIdInput: document.getElementById("patientId"),
    patientDetailsInput: document.getElementById("patientDetails"),
    wardTypeInput: document.getElementById("wardType")
  };
}

function setPickerVisibility(isVisible) {
  const { dropdown, picker } = getPatientPickerElements();
  if (!dropdown || !picker) return;

  homPickerOpen = isVisible;
  dropdown.hidden = !isVisible;
  picker.classList.toggle("is-open", isVisible);
}

function fillPatientForm(record) {
  const { nameInput, patientIdInput, patientDetailsInput, wardTypeInput } = getPatientPickerElements();
  if (!nameInput || !patientIdInput || !patientDetailsInput || !wardTypeInput) return;

  selectedPatientRecord = { ...record };
  nameInput.value = record.name || "";
  patientIdInput.value = record.patientId || "";
  patientDetailsInput.value = buildPatientDetails(record);
  wardTypeInput.value = HOM_WARD_OPTIONS.includes(record.wardType) ? record.wardType : inferWardType(record);
}

function renderPatientDropdown(query = "") {
  const { dropdown } = getPatientPickerElements();
  if (!dropdown) return;

  homPatientCatalog = buildPatientCatalog();
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const matchingPatients = homPatientCatalog.filter((record) => {
    if (!normalizedQuery) return true;
    const haystack = [
      record.name,
      record.patientId,
      record.department,
      record.doctor,
      record.wardType,
      record.status
    ].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  if (matchingPatients.length === 0) {
    dropdown.innerHTML = `
      <div class="hom-picker-empty">
        <strong>No shared patients found</strong>
        <span>Try another name or UHID.</span>
      </div>
    `;
    setPickerVisibility(true);
    return;
  }

  dropdown.innerHTML = matchingPatients.map((record) => `
    <button
      type="button"
      class="hom-picker-option"
      data-patient-id="${escapeHtml(record.patientId)}"
    >
      <div class="hom-picker-option-top">
        <span class="hom-picker-name">${escapeHtml(record.name)}</span>
        <span class="hom-picker-status">${escapeHtml(record.status || "Available")}</span>
      </div>
      <div class="hom-picker-meta">
        <span>${escapeHtml(record.patientId)}</span>
        <span>${escapeHtml(record.department || "General")}</span>
        <span>${escapeHtml(record.wardType || inferWardType(record))}</span>
      </div>
    </button>
  `).join("");

  dropdown.querySelectorAll(".hom-picker-option").forEach((button) => {
    button.addEventListener("click", () => {
      const patient = homPatientCatalog.find((record) => record.patientId === button.dataset.patientId);
      if (!patient) return;
      fillPatientForm(patient);
      setPickerVisibility(false);
    });
  });

  setPickerVisibility(true);
}

function findCatalogPatient(name, patientId) {
  const normalizedName = String(name || "").trim().toLowerCase();
  const normalizedId = String(patientId || "").trim().toLowerCase();

  return homPatientCatalog.find((record) => {
    return record.patientId.toLowerCase() === normalizedId ||
      (normalizedName && record.name.toLowerCase() === normalizedName);
  }) || null;
}

function buildHomSyncRequest(record, patientDetails, wardType) {
  const preRequests = getPreRequests();
  const matchedPreRequest = preRequests.find((item) => item.patientId === record.patientId);
  if (matchedPreRequest) {
    matchedPreRequest.homStatus = "Bed request sent";
    matchedPreRequest.wardType = wardType;
    matchedPreRequest.patientDetails = patientDetails;
    savePreRequests(preRequests);
    return matchedPreRequest;
  }

  return {
    id: `PRE-HOM-${record.patientId}`,
    patientId: record.patientId,
    name: record.name,
    age: record.age || "",
    gender: record.gender || "",
    phone: record.phone || "",
    address: record.address || "",
    department: record.department || "General",
    doctor: record.doctor || "",
    appointmentDate: "",
    bookedDate: "",
    appointmentTime: "",
    status: "Approved",
    visitType: "Admit",
    bedNumber: "",
    rejectReason: "",
    patientStatus: "",
    homStatus: "Bed request sent",
    patientDetails,
    wardType
  };
}

function buildSharedBedRequestRows() {
  const sharedState = typeof ensurePreState === "function" ? ensurePreState() : {};
  const pendingAdmissions = Array.isArray(sharedState.pendingAdmissions) ? sharedState.pendingAdmissions : [];
  const preRequests = Array.isArray(sharedState.preRequests) ? sharedState.preRequests : [];
  const patientDirectory = Array.isArray(sharedState.patientDirectory) ? sharedState.patientDirectory : [];
  const patientProfiles = sharedState.patientProfiles && typeof sharedState.patientProfiles === "object"
    ? sharedState.patientProfiles
    : {};
  const homPatients = Array.isArray(sharedState.patients) ? sharedState.patients : [];

  return pendingAdmissions
    .filter((request) => request?.pre_request_id || String(request?.requestedBy || "").startsWith("PRE-"))
    .map((request) => {
      const patientId = request?.uhid || request?.patient_id || "";
      const preRequest = preRequests.find((item) => item.id === request.pre_request_id || item.patientId === patientId) || {};
      const directoryEntry = patientDirectory.find((item) => item.id === patientId || item.uhid === patientId) || {};
      const profile = patientProfiles[patientId] || {};
      const homPatient = homPatients.find((item) => item.uhid === patientId || item.patientId === patientId) || {};

      const details = request.patientDetails ||
        preRequest.patientDetails ||
        buildPatientDetails({
          gender: preRequest.gender || directoryEntry.gender || profile.gender || homPatient.gender || "",
          age: preRequest.age || directoryEntry.age || profile.age || homPatient.age || "",
          department: request.dept || preRequest.department || directoryEntry.department || homPatient.dept || "",
          doctor: preRequest.doctor || homPatient.physician || ""
        });

      return {
        id: request.id,
        patientId,
        name: request.patient || preRequest.name || directoryEntry.name || profile.name || homPatient.name || "-",
        wardType: request.preferredWard || preRequest.wardType || inferWardType(preRequest),
        patientDetails: details || "-",
        status: request.status || preRequest.homStatus || "Pending",
        updatedAt: Number(request.updatedAt || 0)
      };
    })
    .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0) || left.name.localeCompare(right.name));
}

function sendRequest() {
  const { nameInput, patientIdInput, patientDetailsInput, wardTypeInput } = getPatientPickerElements();
  if (!nameInput || !patientIdInput || !patientDetailsInput || !wardTypeInput) return;

  const name = nameInput.value.trim();
  const patientId = patientIdInput.value.trim();
  const wardType = wardTypeInput.value.trim();
  const patientDetails = patientDetailsInput.value.trim();

  if (!name || !patientId || !patientDetails || !wardType) {
    showMessage("Select a patient and fill all request details", "red");
    return;
  }

  const patientRecord = selectedPatientRecord || findCatalogPatient(name, patientId);
  if (!patientRecord) {
    showMessage("Please choose a patient from the shared list", "red");
    return;
  }

  const requests = getBedRequests();
  const allocations = getBedAllocations();
  const existingRequestIndex = requests.findIndex((item) => item.patientId === patientId && item.status !== "Allocated");
  const requestId = existingRequestIndex === -1 ? `BED-${Date.now()}` : requests[existingRequestIndex].id;
  const requestPayload = {
    id: requestId,
    name,
    patientId,
    wardType,
    patientDetails,
    status: "Pending",
    updatedAt: new Date().toLocaleString("en-IN")
  };

  if (existingRequestIndex === -1) requests.unshift(requestPayload);
  else requests[existingRequestIndex] = { ...requests[existingRequestIndex], ...requestPayload };
  saveBedRequests(requests);

  const allocationPayload = {
    id: existingRequestIndex === -1 ? `ALLOC-${Date.now()}` : (allocations.find((item) => item.requestId === requestId || item.patientId === patientId)?.id || `ALLOC-${Date.now()}`),
    requestId,
    name,
    patientId,
    wardType,
    patientDetails,
    bed: "",
    status: "Awaiting HOM Response"
  };

  const existingAllocationIndex = allocations.findIndex((item) => item.requestId === requestId || item.patientId === patientId);
  if (existingAllocationIndex === -1) allocations.unshift(allocationPayload);
  else allocations[existingAllocationIndex] = { ...allocations[existingAllocationIndex], ...allocationPayload };
  saveBedAllocations(allocations);

  const syncRequest = buildHomSyncRequest(patientRecord, patientDetails, wardType);
  sendPreRequestToHOM(syncRequest, wardType, syncRequest.priority || "High");

  showMessage("Bed request sent");

  nameInput.value = "";
  patientIdInput.value = "";
  patientDetailsInput.value = "";
  wardTypeInput.value = "";
  selectedPatientRecord = null;
  setPickerVisibility(false);

  renderRequests();
}

function notifyEmergency() {
  const id = document.getElementById("emergencyId")?.value.trim();
  const bed = document.getElementById("bedNo")?.value.trim();

  if (!id || !bed) {
    showMessage("Fill all fields", "red");
    return;
  }

  const notifications = getEmergencyNotifications();
  notifications.unshift({
    id: `EMG-${Date.now()}`,
    patientId: id,
    bed,
    status: "Emergency",
    sentAt: new Date().toLocaleString("en-IN")
  });
  saveEmergencyNotifications(notifications);

  const preRequests = getPreRequests();
  const realIndex = preRequests.findIndex((item) => item.patientId === id && item.status === "Emergency");
  if (realIndex !== -1) {
    preRequests[realIndex].homStatus = "HOM notified";
    preRequests[realIndex].bedNumber = bed;
    savePreRequests(preRequests);
  }

  showMessage("Emergency notified to HOM", "orange");

  document.getElementById("emergencyId").value = "";
  document.getElementById("bedNo").value = "";
}

function renderRequests() {
  const requests = buildSharedBedRequestRows();
  const table = document.getElementById("homRequestTable");
  if (!table) return;

  table.innerHTML = "";

  if (requests.length === 0) {
    table.innerHTML = `<tr><td colspan="5">No Requests Found</td></tr>`;
    return;
  }

  table.innerHTML = requests.map((request) => `
    <tr>
      <td>${escapeHtml(request.name)}</td>
      <td>${escapeHtml(request.patientId)}</td>
      <td><span class="hom-ward-pill">${escapeHtml(request.wardType || inferWardType(request))}</span></td>
      <td>${escapeHtml(request.patientDetails || "-")}</td>
      <td><span class="hom-status-pill">${escapeHtml(request.status)}</span></td>
    </tr>
  `).join("");
}

function bindPatientPicker() {
  const { picker, nameInput, patientIdInput, patientDetailsInput, wardTypeInput } = getPatientPickerElements();
  if (!picker || !nameInput || !patientIdInput || !patientDetailsInput || !wardTypeInput) return;

  homPatientCatalog = buildPatientCatalog();
  setPickerVisibility(false);

  nameInput.addEventListener("focus", () => {
    renderPatientDropdown(nameInput.value);
  });

  nameInput.addEventListener("click", () => {
    renderPatientDropdown(nameInput.value);
  });

  nameInput.addEventListener("input", () => {
    selectedPatientRecord = null;
    patientIdInput.value = "";
    patientDetailsInput.value = "";
    wardTypeInput.value = "";
    renderPatientDropdown(nameInput.value);
  });

  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setPickerVisibility(false);
  });

  document.addEventListener("click", (event) => {
    if (!picker.contains(event.target)) setPickerVisibility(false);
  });
}

function refreshHomPageData() {
  homPatientCatalog = buildPatientCatalog();

  if (selectedPatientRecord?.patientId) {
    const refreshedRecord = homPatientCatalog.find((record) => record.patientId === selectedPatientRecord.patientId);
    if (refreshedRecord) fillPatientForm(refreshedRecord);
  }

  const { nameInput } = getPatientPickerElements();
  if (homPickerOpen || document.activeElement === nameInput) {
    renderPatientDropdown(nameInput?.value || "");
  }

  renderRequests();
}

document.addEventListener("DOMContentLoaded", () => {
  bindPatientPicker();
  refreshHomPageData();
});

bindSharedStateRefresh(() => {
  refreshHomPageData();
});
