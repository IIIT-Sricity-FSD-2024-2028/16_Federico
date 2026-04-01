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

function toTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!hasValue(value)) return 0;

  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function resolveRequestStatus(request) {
  if (hasValue(request?.patientStatus)) return request.patientStatus;
  if (request?.status === "Completed") return "Completed";
  if (hasValue(request?.status)) return request.status;
  return "";
}

function deriveAdmissionStatus(admission) {
  if (!admission) return "";
  if (admission.discharged) return "Discharged";
  if (admission.discharge_requested) return "Pending Discharge";
  return "Admitted";
}

function createEmptyRecord(patientId) {
  return {
    patientId,
    name: "",
    age: "",
    gender: "",
    department: "",
    doctor: "",
    appointmentDate: "",
    appointmentTime: "",
    bedNumber: "",
    visitType: "",
    status: "",
    updatedAt: 0
  };
}

function mergeSharedField(record, field, value, overwrite = false) {
  if (!hasValue(value)) return;
  if (overwrite || !hasValue(record[field])) record[field] = value;
}

function buildSharedPatientRecords() {
  const sharedState = typeof ensurePreState === "function"
    ? ensurePreState()
    : (typeof readSharedState === "function" ? readSharedState() : {});
  const records = new Map();
  const preRequests = Array.isArray(sharedState.preRequests) ? [...sharedState.preRequests] : [];
  const patientDirectory = Array.isArray(sharedState.patientDirectory) ? sharedState.patientDirectory : [];
  const profiles = sharedState.patientProfiles && typeof sharedState.patientProfiles === "object"
    ? sharedState.patientProfiles
    : {};
  const homPatients = Array.isArray(sharedState.patients) ? sharedState.patients : [];
  const pendingAdmissions = Array.isArray(sharedState.pendingAdmissions) ? sharedState.pendingAdmissions : [];
  const admissions = Object.values(sharedState.admissions || {});

  function getRecord(patientId) {
    if (!records.has(patientId)) records.set(patientId, createEmptyRecord(patientId));
    return records.get(patientId);
  }

  preRequests
    .sort((left, right) => {
      const leftTs = toTimestamp(left?.updated_at || left?.booked_at || left?.created_at || left?.appointmentDate);
      const rightTs = toTimestamp(right?.updated_at || right?.booked_at || right?.created_at || right?.appointmentDate);
      return rightTs - leftTs;
    })
    .forEach((request) => {
      const patientId = request?.patientId || request?.uhid;
      if (!hasValue(patientId)) return;

      const record = getRecord(patientId);
      const requestTs = toTimestamp(request.updated_at || request.booked_at || request.created_at || request.appointmentDate);
      const isNewestRequest = requestTs >= (record.updatedAt || 0);

      mergeSharedField(record, "name", request.name, !hasValue(record.name));
      mergeSharedField(record, "age", request.age, !hasValue(record.age));
      mergeSharedField(record, "gender", request.gender, !hasValue(record.gender));

      if (isNewestRequest) {
        mergeSharedField(record, "department", request.department, true);
        mergeSharedField(record, "doctor", request.doctor, true);
        mergeSharedField(record, "appointmentDate", request.appointmentDate, true);
        mergeSharedField(record, "appointmentTime", request.appointmentTime, true);
        mergeSharedField(record, "bedNumber", request.bedNumber, true);
        mergeSharedField(record, "visitType", request.visitType, true);
        mergeSharedField(record, "status", resolveRequestStatus(request), true);
        record.updatedAt = requestTs;
      }
    });

  patientDirectory.forEach((entry) => {
    const patientId = entry?.id || entry?.uhid;
    if (!hasValue(patientId)) return;

    const record = getRecord(patientId);
    mergeSharedField(record, "name", entry.name);
    mergeSharedField(record, "age", entry.age);
    mergeSharedField(record, "gender", entry.gender);
  });

  Object.entries(profiles).forEach(([patientId, profile]) => {
    if (!hasValue(patientId)) return;

    const record = getRecord(patientId);
    mergeSharedField(record, "name", profile?.name, true);
    mergeSharedField(record, "age", profile?.age, true);
    mergeSharedField(record, "gender", profile?.gender, true);
  });

  pendingAdmissions.forEach((entry) => {
    const patientId = entry?.uhid || entry?.patient_id || entry?.patientId;
    if (!hasValue(patientId)) return;

    const record = getRecord(patientId);
    mergeSharedField(record, "name", entry.patient, true);
    mergeSharedField(record, "department", entry.dept, true);
    mergeSharedField(record, "status", entry.status || "Pending Admission", true);
  });

  homPatients.forEach((patient) => {
    const patientId = patient?.uhid || patient?.patientId || patient?.id;
    if (!hasValue(patientId)) return;

    const record = getRecord(patientId);
    mergeSharedField(record, "name", patient.name || patient.patient, true);
    mergeSharedField(record, "age", patient.age, true);
    mergeSharedField(record, "department", patient.dept, true);
    mergeSharedField(record, "doctor", patient.physician, true);
    mergeSharedField(record, "bedNumber", patient.bed || patient.ward_no, true);
    mergeSharedField(record, "status", patient.status, true);
    mergeSharedField(record, "visitType", patient.visitType || (hasValue(patient.bed) ? "Admit" : ""), !hasValue(record.visitType));
    record.updatedAt = Math.max(record.updatedAt || 0, toTimestamp(patient.admitted));
  });

  admissions.forEach((admission) => {
    const patientId = admission?.uhid || admission?.patientId;
    if (!hasValue(patientId)) return;

    const record = getRecord(patientId);
    mergeSharedField(record, "name", admission.patient_name, true);
    mergeSharedField(record, "doctor", admission.doctor_assigned, true);
    mergeSharedField(record, "bedNumber", admission.ward_no, true);
    mergeSharedField(record, "status", deriveAdmissionStatus(admission), true);
    record.updatedAt = Math.max(record.updatedAt || 0, toTimestamp(admission.admitted_at));
  });

  return [...records.values()]
    .sort((left, right) => {
      return (right.updatedAt || 0) - (left.updatedAt || 0) ||
        String(left.patientId || "").localeCompare(String(right.patientId || ""));
    });
}

function renderRecords() {
  const table = document.getElementById("recordTable");
  if (!table) return;

  const records = buildSharedPatientRecords();

  if (records.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Records Found</td></tr>`;
    return;
  }

  table.innerHTML = records.map((record) => `
    <tr>
      <td>${escapeHtml(record.patientId || "-")}</td>
      <td>${escapeHtml(record.name || "-")}</td>
      <td>${escapeHtml(record.age || "-")}</td>
      <td>${escapeHtml(record.gender || "-")}</td>
      <td>${escapeHtml(record.department || "-")}</td>
      <td>${escapeHtml(record.doctor || "-")}</td>
      <td>${escapeHtml(record.appointmentDate || "-")}</td>
      <td>${escapeHtml(record.appointmentTime || "-")}</td>
      <td>${escapeHtml(record.bedNumber || "-")}</td>
      <td>${escapeHtml(record.visitType || "-")}</td>
      <td>${escapeHtml(record.status || "-")}</td>
    </tr>
  `).join("");
}

document.addEventListener("DOMContentLoaded", renderRecords);
bindSharedStateRefresh(renderRecords);
