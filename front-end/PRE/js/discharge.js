function getDischargeRequests() {
  const resolveVisitType = (item) => {
    if (["Emergency", "Admit"].includes(item?.visitType)) return item.visitType;
    if (item?.status === "Emergency" || item?.patientStatus === "Emergency") return "Emergency";
    if (
      item?.status === "Admitted" ||
      item?.patientStatus === "Admitted" ||
      item?.status === "Discharge" ||
      item?.patientStatus === "Discharge Pending" ||
      item?.patientStatus === "Approved Discharge" ||
      item?.status === "Approved Discharge"
    ) return "Admit";
    return "";
  };

  return getPreRequests().filter(item =>
    ["Emergency", "Admit"].includes(resolveVisitType(item)) && (
    item.patientStatus === "Discharge Pending" ||
    item.status === "Discharge" ||
    item.patientStatus === "Approved Discharge" ||
    item.patientStatus === "Discharged" ||
    item.status === "Approved Discharge"
    )
  );
}

function renderDischarge() {
  const table = document.getElementById("dischargeTable");
  if (!table) return;

  const pending = getDischargeRequests().filter(item => item.patientStatus === "Discharge Pending" || item.status === "Discharge");
  table.innerHTML = "";

  if (pending.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Pending Requests</td></tr>`;
    return;
  }

  pending.forEach((r) => {
    table.innerHTML += `
      <tr>
        <td>${r.patientId || "-"}</td>
        <td>${r.name || "-"}</td>
        <td>${r.age || "-"}</td>
        <td>${r.gender || "-"}</td>
        <td>${r.department || "-"}</td>
        <td>${r.doctor || "-"}</td>
        <td>${r.appointmentDate || "-"}</td>
        <td>${r.appointmentTime || "-"}</td>
        <td>${r.bedNumber || "-"}</td>
        <td>${r.visitType || "-"}</td>
        <td style="color:orange;">
          ${r.homStatus || "Awaiting HOM"}
          <div style="margin-top:6px;">
            <button class="btn suggest" onclick="requestDischargeFromPre('${r.id || ""}')">Request Discharge</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function requestDischargeFromPre(requestId) {
  const requests = getPreRequests();
  const request = requests.find((item) => item.id === requestId);
  if (!request) return;

  const shared = readSharedState() || {};
  if (!shared.admissions || typeof shared.admissions !== "object") shared.admissions = {};

  const targetPatientId = String(request.patientId || request.uhid || "").trim();
  const targetName = String(request.name || "").trim().toLowerCase();
  const admission = Object.values(shared.admissions).find((item) => {
    const admissionPatientId = String(item?.patient_id || item?.uhid || "").trim();
    const admissionName = String(item?.patient_name || item?.name || "").trim().toLowerCase();
    return (
      (targetPatientId && admissionPatientId === targetPatientId) ||
      (targetName && admissionName === targetName)
    );
  });

  if (!admission) {
    alert("No matching admission found in shared state.");
    return;
  }

  admission.discharge_requested = true;
  admission.discharge_initiated_by = "PRE"; // CHANGED: mark PRE-origin discharge signal for HOM workflow
  request.homStatus = "Discharge requested by PRE";
  request.updated_at = Date.now();
  savePreRequests(requests);

  shared.preRequests = requests;
  saveSharedState(shared);

  renderDischarge();
  renderApproved();
}

function renderApproved() {
  const table = document.getElementById("approvedDischargeTable");
  if (!table) return;

  const approved = getDischargeRequests().filter(item =>
    item.patientStatus === "Approved Discharge" || item.status === "Approved Discharge"
  );
  table.innerHTML = "";

  if (approved.length === 0) {
    table.innerHTML = `<tr><td colspan="12">No Approved Requests</td></tr>`;
    return;
  }

  approved.forEach((r) => {
    table.innerHTML += `
      <tr>
        <td>${r.patientId || "-"}</td>
        <td>${r.name || "-"}</td>
        <td>${r.age || "-"}</td>
        <td>${r.gender || "-"}</td>
        <td>${r.department || "-"}</td>
        <td>${r.doctor || "-"}</td>
        <td>${r.appointmentDate || "-"}</td>
        <td>${r.appointmentTime || "-"}</td>
        <td>${r.bedNumber || "-"}</td>
        <td>${r.visitType || "-"}</td>
        <td style="color:green;">Ready for PRE</td>
        <td>
          <button class="btn approve" onclick="finalApprove('${r.id}')">Approve</button>
        </td>
      </tr>
    `;
  });
}

function finalApprove(requestId) {
  const requests = getPreRequests();
  const realIndex = requests.findIndex(item => item.id === requestId);
  if (realIndex === -1) return;

  requests[realIndex].patientStatus = "Approved Discharge";
  requests[realIndex].status = "Approved Discharge";
  requests[realIndex].visitType =
    requests[realIndex].visitType ||
    (requests[realIndex].homStatus === "HOM notified" ? "Emergency" : "Admit");
  requests[realIndex].homStatus = "Closed by PRE";
  requests[realIndex].updated_at = Date.now();
  savePreRequests(requests);

  const shared = readSharedState();
  const admission = Object.values(shared.admissions || {}).find(item =>
    item.patient_id === requests[realIndex].patientId || item.uhid === requests[realIndex].patientId
  );
  if (admission) admission.discharged = true;
  saveSharedState(shared);

  renderDischarge();
  renderApproved();
}

document.addEventListener("DOMContentLoaded", () => {
  renderDischarge();
  renderApproved();
});

bindSharedStateRefresh(() => {
  renderDischarge();
  renderApproved();
});
