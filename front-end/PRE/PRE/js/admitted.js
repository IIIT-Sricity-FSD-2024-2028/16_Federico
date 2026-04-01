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

function renderAdmittedRecords() {
  const requests = getPreRequests().filter((r) => r.status === "Admitted");
  const table = document.getElementById("admittedTable");
  if (!table) return;

  table.innerHTML = "";

  if (requests.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Admitted Patients Found</td></tr>`;
    return;
  }

  requests.forEach((request) => {
    table.innerHTML += `
      <tr>
        <td>${request.patientId || "-"}</td>
        <td>${request.name || "-"}</td>
        <td>${request.age || "-"}</td>
        <td>${request.gender || "-"}</td>
        <td>${request.department || "-"}</td>
        <td>${request.doctor || "-"}</td>
        <td>${request.appointmentDate || "-"}</td>
        <td>${request.appointmentTime || "-"}</td>
        <td>Admitted</td>
        <td>${request.bedNumber || "-"}</td>
        <td>
          <button class="btn reject" onclick="dischargePatient('${request.id}')">Mark for Follow-up</button>
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

  showSuccess("Discharge request sent to HOM");
  renderAdmittedRecords();
}

document.addEventListener("DOMContentLoaded", renderAdmittedRecords);
bindSharedStateRefresh(renderAdmittedRecords);
