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
  if (request?.patientStatus === "Discharge Pending" || request?.status === "Discharge") return "Pending";
  if (
    request?.patientStatus === "Approved Discharge" ||
    request?.patientStatus === "Discharged" ||
    request?.status === "Approved Discharge" ||
    request?.status === "Discharged" ||
    request?.patientStatus === "Completed" ||
    request?.status === "Completed"
  ) return "Discharged";
  if (hasValue(request?.patientStatus)) return request.patientStatus;
  if (hasValue(request?.status)) return request.status;
  return "";
}

function isClosedStatus(status) {
  return status === "Discharged";
}

function mergeStatus(record, nextStatus, overwrite = false) {
  if (!hasValue(nextStatus)) return;
  if (isClosedStatus(record.status) && !isClosedStatus(nextStatus)) return;
  if (overwrite || !hasValue(record.status)) record.status = nextStatus;
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
    updatedAt: 0,
    latestRequestVisitType: "",
    lockedToPreDischarge: false,
    lockedToPreDischargeWorkflow: false
  };
}

function normalizeDoctorName(value) {
  return hasValue(value) ? value : "-";
}

function normalizeAppointmentTime(value) {
  return hasValue(value) ? value : "-";
}

function normalizeBedValue(visitType, bedNumber) {
  if (visitType === "Consultation") return "None";
  return hasValue(bedNumber) ? bedNumber : "None";
}

function createDemoPatientRecords() {
  return [
    { patientId: "FED-REC-1001", name: "Aarav Mehta", age: "41", gender: "Male", department: "Cardiology", doctor: "Dr Qasim", appointmentDate: "2026-04-02", appointmentTime: "09:30", bedNumber: "IP-11", visitType: "Admit", status: "Pending", updatedAt: toTimestamp("2026-04-02T09:30:00") },
    { patientId: "FED-REC-1002", name: "Nisha Verma", age: "33", gender: "Female", department: "Orthopedics", doctor: "Dr Sachin", appointmentDate: "2026-04-02", appointmentTime: "10:15", bedNumber: "None", visitType: "Consultation", status: "Discharged", updatedAt: toTimestamp("2026-04-02T10:30:00") },
    { patientId: "FED-REC-1003", name: "Rahul Iyer", age: "52", gender: "Male", department: "Neurology", doctor: "Dr Hamiz", appointmentDate: "2026-04-03", appointmentTime: "11:00", bedNumber: "ER-04", visitType: "Emergency", status: "Pending", updatedAt: toTimestamp("2026-04-03T11:10:00") },
    { patientId: "FED-REC-1004", name: "Pooja Nair", age: "28", gender: "Female", department: "General Medicine", doctor: "Dr Rahul", appointmentDate: "2026-04-03", appointmentTime: "12:00", bedNumber: "None", visitType: "Consultation", status: "Discharged", updatedAt: toTimestamp("2026-04-03T12:20:00") },
    { patientId: "FED-REC-1005", name: "Imran Ali", age: "47", gender: "Male", department: "Pulmonology", doctor: "Dr Priya", appointmentDate: "2026-04-03", appointmentTime: "13:15", bedNumber: "IP-22", visitType: "Admit", status: "Discharged", updatedAt: toTimestamp("2026-04-03T13:35:00") },
    { patientId: "FED-REC-1006", name: "Sneha Kapoor", age: "39", gender: "Female", department: "Dermatology", doctor: "Dr Anita", appointmentDate: "2026-04-04", appointmentTime: "09:45", bedNumber: "None", visitType: "Consultation", status: "Discharged", updatedAt: toTimestamp("2026-04-04T09:55:00") },
    { patientId: "FED-REC-1007", name: "Vivek Reddy", age: "61", gender: "Male", department: "Oncology", doctor: "Dr Vikram", appointmentDate: "2026-04-04", appointmentTime: "10:50", bedNumber: "IP-31", visitType: "Admit", status: "Pending", updatedAt: toTimestamp("2026-04-04T11:00:00") },
    { patientId: "FED-REC-1008", name: "Farah Khan", age: "30", gender: "Female", department: "Pediatrics", doctor: "Dr Meera", appointmentDate: "2026-04-04", appointmentTime: "14:10", bedNumber: "ER-08", visitType: "Emergency", status: "Discharged", updatedAt: toTimestamp("2026-04-04T14:30:00") },
    { patientId: "FED-REC-1009", name: "Kiran Rao", age: "55", gender: "Male", department: "Surgery", doctor: "Dr Kammran", appointmentDate: "2026-04-05", appointmentTime: "15:00", bedNumber: "IP-09", visitType: "Admit", status: "Pending", updatedAt: toTimestamp("2026-04-05T15:05:00") },
    { patientId: "FED-REC-1010", name: "Megha Das", age: "26", gender: "Female", department: "Gynecology", doctor: "Dr Meera", appointmentDate: "2026-04-05", appointmentTime: "16:20", bedNumber: "None", visitType: "Consultation", status: "Discharged", updatedAt: toTimestamp("2026-04-05T16:35:00") }
  ];
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
        mergeStatus(record, resolveRequestStatus(request), true);
        const resolvedStatus = resolveRequestStatus(request);
        record.latestRequestVisitType = request.visitType || "";
        record.lockedToPreDischarge =
          request.visitType === "Consultation" &&
          resolvedStatus === "Discharged";
        record.lockedToPreDischargeWorkflow =
          ["Emergency", "Admit"].includes(request.visitType) &&
          ["Pending", "Discharged"].includes(resolvedStatus);

        if (record.lockedToPreDischarge) {
          record.bedNumber = "";
        }
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
    if (record.lockedToPreDischargeWorkflow) return;
    mergeSharedField(record, "name", entry.patient, true);
    mergeSharedField(record, "department", entry.dept, true);
    mergeStatus(record, entry.status || "Pending Admission", true);
  });

  homPatients.forEach((patient) => {
    const patientId = patient?.uhid || patient?.patientId || patient?.id;
    if (!hasValue(patientId)) return;

    const record = getRecord(patientId);
    if (record.lockedToPreDischarge || record.lockedToPreDischargeWorkflow) return;
    mergeSharedField(record, "name", patient.name || patient.patient, true);
    mergeSharedField(record, "age", patient.age, true);
    mergeSharedField(record, "department", patient.dept, true);
    mergeSharedField(record, "doctor", patient.physician, true);
    mergeSharedField(record, "bedNumber", patient.bed || patient.ward_no, true);
    mergeStatus(record, patient.status, true);
    mergeSharedField(record, "visitType", patient.visitType || (hasValue(patient.bed) ? "Admit" : ""), !hasValue(record.visitType));
    record.updatedAt = Math.max(record.updatedAt || 0, toTimestamp(patient.admitted));
  });

  admissions.forEach((admission) => {
    const patientId = admission?.uhid || admission?.patientId;
    if (!hasValue(patientId)) return;

    const record = getRecord(patientId);
    if (record.lockedToPreDischarge || record.lockedToPreDischargeWorkflow) return;
    mergeSharedField(record, "name", admission.patient_name, true);
    mergeSharedField(record, "doctor", admission.doctor_assigned, true);
    mergeSharedField(record, "bedNumber", admission.ward_no, true);
    mergeStatus(record, deriveAdmissionStatus(admission), true);
    record.updatedAt = Math.max(record.updatedAt || 0, toTimestamp(admission.admitted_at));
  });

  return [...records.values()]
    .filter((record) => ["Pending", "Discharged"].includes(record.status))
    .sort((left, right) => {
      return (right.updatedAt || 0) - (left.updatedAt || 0) ||
        String(left.patientId || "").localeCompare(String(right.patientId || ""));
    });
}

function renderRecords() {
  const table = document.getElementById("recordTable");
  if (!table) return;

  const liveRecords = buildSharedPatientRecords();
  const records = [...liveRecords, ...createDemoPatientRecords()]
    .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
    .slice(0, liveRecords.length + 10);

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
      <td>${escapeHtml(normalizeDoctorName(record.doctor))}</td>
      <td>${escapeHtml(record.appointmentDate || "-")}</td>
      <td>${escapeHtml(normalizeAppointmentTime(record.appointmentTime))}</td>
      <td>${escapeHtml(normalizeBedValue(record.visitType, record.bedNumber))}</td>
      <td>${escapeHtml(record.visitType || "-")}</td>
      <td>${escapeHtml(record.status || "Pending")}</td>
    </tr>
  `).join("");
}

document.addEventListener("DOMContentLoaded", renderRecords);
bindSharedStateRefresh(renderRecords);
