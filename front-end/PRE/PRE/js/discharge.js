function getDischargeRequests() {
  return getPreRequests().filter(item =>
    item.patientStatus === "Discharge Pending" || item.patientStatus === "Approved Discharge" || item.patientStatus === "Discharged"
  );
}

function renderDischarge() {
  const table = document.getElementById("dischargeTable");
  if (!table) return;

  const pending = getDischargeRequests().filter(item => item.patientStatus === "Discharge Pending");
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
        <td style="color:orange;">${r.homStatus || "Awaiting HOM"}</td>
      </tr>
    `;
  });
}

function renderApproved() {
  const table = document.getElementById("approvedDischargeTable");
  if (!table) return;

  const approved = getDischargeRequests().filter(item => item.patientStatus === "Approved Discharge");
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

  requests[realIndex].patientStatus = "Discharged";
  requests[realIndex].status = "Completed";
  requests[realIndex].homStatus = "Closed by PRE";
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
