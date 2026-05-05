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

function extractAgeValue(...values) {
  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;

    if (/^\d+$/.test(raw)) return raw;

    const matchedAge = raw.match(/\b(\d{1,3})\b/);
    if (matchedAge) return matchedAge[1];
  }

  return "-";
}

function resolveAdmittedAge(request) {
  const state = ensurePreState();
  const patientId = request?.patientId || "";
  const profile = state.patientProfiles?.[patientId] || {};
  const directoryEntry = (state.patientDirectory || []).find((item) =>
    item?.id === patientId || item?.uhid === patientId
  ) || {};
  const homPatient = (state.patients || []).find((item) =>
    item?.uhid === patientId || item?.patientId === patientId || item?.id === patientId
  ) || {};

  return extractAgeValue(
    request?.age,
    profile?.age,
    directoryEntry?.age,
    homPatient?.age,
    request?.patientDetails
  );
}

function renderAdmittedRecords() {
  const requests = getPreRequests().filter((r) => r.status === "Admitted" || r.patientStatus === "Admitted");
  const table = document.getElementById("admittedTable");
  if (!table) return;

  table.innerHTML = "";

  if (requests.length === 0) {
    table.innerHTML = `<tr><td colspan="11">No Admitted Patients Found</td></tr>`;
    return;
  }

  requests.forEach((request) => {
    const resolvedAge = resolveAdmittedAge(request);
    table.innerHTML += `
      <tr>
        <td>${request.patientId || "-"}</td>
        <td>${request.name || "-"}</td>
        <td>${resolvedAge}</td>
        <td>${request.gender || "-"}</td>
        <td>${request.department || "-"}</td>
        <td>${request.doctor || "-"}</td>
        <td>${request.appointmentDate || "-"}</td>
        <td>${request.appointmentTime || "-"}</td>
        <td>Admitted</td>
        <td>${request.bedNumber || "-"}</td>
        <td>
          <button class="btn reject" onclick="dischargePatient('${request.id}')">Discharge request</button>
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
  requests[realIndex].visitType = requests[realIndex].visitType || "Admit";
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

  showSuccess("Discharge request sent to HOM");
  renderAdmittedRecords();
}

document.addEventListener("DOMContentLoaded", renderAdmittedRecords);
bindSharedStateRefresh(renderAdmittedRecords);
