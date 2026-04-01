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
    (r) => r.visitType === "Emergency" && r.status === "Emergency"
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
  let requests = getPreRequests();
  let realIndex = requests.findIndex((r) => r.id === requestId);
  if (realIndex === -1) return;

  requests[realIndex].status = "Discharge";
  requests[realIndex].patientStatus = "Discharge Pending";
  requests[realIndex].homStatus = "Awaiting HOM";

  savePreRequests(requests);
  showSuccess("Patient sent to Discharge Request");
  renderEmergencyRecords();
}

document.addEventListener("DOMContentLoaded", renderEmergencyRecords);
bindSharedStateRefresh(renderEmergencyRecords);
