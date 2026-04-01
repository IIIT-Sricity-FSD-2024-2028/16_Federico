let requests = getPreRequests();

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

function renderApproved() {
  requests = getPreRequests();
  const table = document.getElementById("approvedTable");
  if (!table) return;

  table.innerHTML = "";

  let approved = requests.filter(
    (r) => r.status === "Approved" || r.status === "Rescheduled"
  );

  if (approved.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Approved Patients</td></tr>`;
    return;
  }

  approved.forEach((r) => {
    let rowStyle =
      r.status === "Rescheduled" ? "style='background:#fff7ed'" : "";

    table.innerHTML += `
      <tr ${rowStyle}>
        <td>${r.patientId || "-"}</td>
        <td>${r.name || "-"}</td>
        <td>${r.age || "-"}</td>
        <td>${r.gender || "-"}</td>
        <td>${r.department || "-"}</td>
        <td>${r.doctor || "-"}</td>
        <td>${r.appointmentDate || "-"}</td>
        <td>${r.appointmentTime || "-"}</td>
        <td>
          ${r.visitType || "-"}
          ${
            r.status === "Rescheduled"
              ? "<br><small style='color:orange'>(Rescheduled)</small>"
              : ""
          }
        </td>
        <td>
          <select class="custom-select" onchange="setVisitType('${r.id}', this.value)">
            <option value="">-- Select Visit --</option>
            <option value="Emergency" ${
              r.visitType === "Emergency" ? "selected" : ""
            }>Emergency</option>
            <option value="Consultation" ${
              r.visitType === "Consultation" ? "selected" : ""
            }>Consultation</option>
            <option value="Admit" ${
              r.visitType === "Admit" ? "selected" : ""
            }>Admit</option>
          </select>
        </td>
        <td>
          <button class="btn reject" onclick="dischargePatient('${r.id}')">
            Discharge request
          </button>
        </td>
      </tr>
    `;
  });
}

function openBedPopup(index, type) {
  let popup = document.createElement("div");
  popup.className = "approve-popup";
  popup.id = "bedPopup";

  popup.innerHTML = `
    <div class="approve-box">
      <h2>${type} Patient</h2>
      <input type="text" id="bedNumber" placeholder="Enter Bed Number">
      <div class="popup-buttons">
        <button onclick="confirmBed(${index}, '${type}')">Submit</button>
        <button onclick="closeBedPopup()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
}

function closeBedPopup() {
  let popup = document.getElementById("bedPopup");
  if (popup) popup.remove();
}

function confirmBed(realIndex, type) {
  requests = getPreRequests();
  let bed = document.getElementById("bedNumber").value.trim();

  if (!bed) {
    showSuccess("Enter Bed Number");
    return;
  }

  requests[realIndex].bedNumber = bed;

  if (type === "Emergency") {
    requests[realIndex].status = "Emergency";
    requests[realIndex].patientStatus = "Emergency";
    requests[realIndex].homStatus = "Pending HOM notification";
    showSuccess("Emergency patient moved successfully");
  }

  if (type === "Admit") {
    requests[realIndex].status = "Admitted";
    requests[realIndex].patientStatus = "Admitted";
    requests[realIndex].homStatus = "Bed confirmed";
    showSuccess("Patient moved to Admitted section");
  }

  closeBedPopup();
  saveData();
}

function setVisitType(requestId, value) {
  requests = getPreRequests();
  let realIndex = requests.findIndex((r) => r.id === requestId);
  if (realIndex === -1) return;

  requests[realIndex].visitType = value;

  if (value === "Emergency") {
    openBedPopup(realIndex, "Emergency");
    return;
  }

  if (value === "Admit") {
    openBedPopup(realIndex, "Admit");
    return;
  }

  saveData();
}

function dischargePatient(requestId) {
  requests = getPreRequests();
  let realIndex = requests.findIndex((r) => r.id === requestId);
  if (realIndex === -1) return;

  if (!requests[realIndex].visitType) {
    showSuccess("Please select Visit Type first");
    return;
  }

  if (requests[realIndex].visitType !== "Consultation") {
    showSuccess("Only Consultation patients discharge here");
    return;
  }

  requests[realIndex].patientStatus = "Discharge Pending";
  requests[realIndex].status = "Discharge";
  requests[realIndex].homStatus = "Awaiting HOM";

  saveData();
  showSuccess("Sent to Discharge Request");
}

function updateDashboardCounters() {
  requests = getPreRequests();
  let pending = requests.filter((r) => r.status === "Pending").length;
  let rejected = requests.filter((r) => r.status === "Rejected").length;
  let admitted = requests.filter((r) => r.status === "Admitted").length;

  let p = document.getElementById("pending");
  let r = document.getElementById("rejected");
  let a = document.getElementById("admitted");

  if (p) p.innerText = pending + " Requests";
  if (r) r.innerText = rejected + " Requests";
  if (a) a.innerText = admitted + " Patients";
}

function saveData() {
  savePreRequests(requests);
  renderApproved();
  updateDashboardCounters();
}

document.addEventListener("DOMContentLoaded", () => {
  renderApproved();
  updateDashboardCounters();
});
bindSharedStateRefresh(() => {
  requests = getPreRequests();
  renderApproved();
  updateDashboardCounters();
});
