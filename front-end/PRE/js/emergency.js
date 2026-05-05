function showSuccess(msg) {
  let el = document.getElementById("successMsg");
  let popup = document.getElementById("successPopup");

  if (el && popup) {
    el.innerText = msg;
    popup.style.display = "flex";
  }
}

function closeSuccess() {
  let popup = document.getElementById("successPopup");
  if (popup) popup.style.display = "none";
}

function renderEmergencyRecords() {
  let requests = getPreRequests();
  const table = document.getElementById("admittedTable");
  if (!table) return;

  table.innerHTML = "";

  let emergency = requests.filter(
    (r) => r.visitType === "Emergency" && (r.status === "Emergency" || r.patientStatus === "Emergency")
  );

  if (emergency.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Emergency Patients Found</td></tr>`;
    return;
  }

  emergency.forEach((r) => {
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
        <td>Emergency</td>
        <td>${r.bedNumber || "-"}</td>
        <td>
          <button class="discharge-btn" onclick="dischargePatient('${r.id}')">Discharge request</button>
        </td>
      </tr>
    `;
  });
}

function dischargePatient(requestId) {
  const state = ensurePreState();
  let requests = Array.isArray(state.preRequests) ? state.preRequests : [];
  let realIndex = requests.findIndex((r) => r.id === requestId);
  if (realIndex === -1) return;

  requests[realIndex].status = "Discharge";
  requests[realIndex].patientStatus = "Discharge Pending";
  requests[realIndex].visitType = requests[realIndex].visitType || "Emergency";
  requests[realIndex].homStatus = "Awaiting HOM";
  requests[realIndex].decided_at = Date.now();
  requests[realIndex].updated_at = Date.now();
  const patientId = requests[realIndex].patientId;
  const admission = Object.values(state.admissions || {}).find((item) => item.uhid === patientId || item.patient_id === patientId);
  const patient = (state.patients || []).find((item) => item.uhid === patientId || item.patientId === patientId);
  if (admission) admission.discharge_requested = true;
  if (patient) patient.status = "Pending Discharge";
  state.preRequests = requests;
  saveSharedState(state);

  showSuccess("Patient sent to Discharge Request");
  renderEmergencyRecords();
}

document.addEventListener("DOMContentLoaded", renderEmergencyRecords);
bindSharedStateRefresh(renderEmergencyRecords);
