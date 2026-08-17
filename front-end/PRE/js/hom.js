/**
 * PRE/js/hom.js — Phase 3 rewrite.
 *
 * Two independent things live on this page:
 *  1. Bed Allocation Request — for a patient who already has a
 *     pre-request needing a bed (APPROVED+visit_type Admit, or
 *     EMERGENCY), PRE requests a bed via the real ward/bed-requests
 *     endpoint (the ONE path that can ever drive a pre-request to
 *     ADMITTED — see preRequest.controller.js).
 *  2. Discharge Requests — a read-only mirror of what HOM has done with
 *     PRE's discharge requests (same data discharge.html shows, kept
 *     here too since the original page had both).
 */

let candidatePatients = [];
let selectedCandidate = null;
let pickerOpen = false;

function showMessage(msg, color = 'green') {
  const box = document.getElementById('msgBox');
  if (!box) return;
  box.innerText = msg;
  box.style.backgroundColor = color;
  box.style.display = 'block';
  setTimeout(() => {
    box.style.display = 'none';
  }, 3000);
}

function getPickerElements() {
  return {
    picker: document.getElementById('patientPicker'),
    dropdown: document.getElementById('patientListDropdown'),
    nameInput: document.getElementById('name'),
    patientIdInput: document.getElementById('patientId'),
  };
}

function setPickerVisibility(visible) {
  const { dropdown, picker } = getPickerElements();
  if (!dropdown || !picker) return;
  pickerOpen = visible;
  dropdown.hidden = !visible;
  picker.classList.toggle('is-open', visible);
}

async function loadCandidates() {
  const [preRequests, patients] = await Promise.all([
    window.ApiClient.preRequests.list(),
    window.ApiClient.patients.list(),
  ]);
  const patientsById = {};
  patients.forEach((p) => (patientsById[p.patient_id] = p));

  const bedRequests = await window.ApiClient.wards.bedRequests.list();
  const requestedPreRequestIds = new Set(
    bedRequests.filter((r) => r.status === 'PENDING').map((r) => r.pre_request_id),
  );

  candidatePatients = preRequests
    .filter(
      (r) =>
        ((r.status === 'APPROVED' && r.visit_type === 'Admit') || r.status === 'EMERGENCY') &&
        !requestedPreRequestIds.has(r.pre_request_id),
    )
    .map((r) => {
      const patient = patientsById[r.patient_id] || {};
      return {
        preRequestId: r.pre_request_id,
        patientId: r.patient_id,
        uhid: patient.uhid || '-',
        name: patient.name || '-',
        department: r.department,
        visitType: r.visit_type,
        priority: r.visit_type === 'Emergency' ? 'CRITICAL' : 'NORMAL',
      };
    });
}

function renderDropdown(query) {
  const { dropdown } = getPickerElements();
  if (!dropdown) return;

  const q = String(query || '').trim().toLowerCase();
  const matches = candidatePatients.filter((c) => !q || `${c.uhid} ${c.name} ${c.department}`.toLowerCase().includes(q));

  if (matches.length === 0) {
    dropdown.innerHTML = `<div class="hom-picker-empty"><strong>No patients awaiting a bed</strong><span>Approve an Admit/Emergency request first.</span></div>`;
    setPickerVisibility(true);
    return;
  }

  dropdown.innerHTML = matches
    .map(
      (c) => `
      <button type="button" class="hom-picker-option" data-pre-request-id="${c.preRequestId}">
        <div class="hom-picker-option-top">
          <span class="hom-picker-name">${PREHelpers.escapeHtml(c.name)}</span>
          <span class="hom-picker-status">${PREHelpers.escapeHtml(c.visitType)}</span>
        </div>
        <div class="hom-picker-meta">
          <span>${PREHelpers.escapeHtml(c.uhid)}</span>
          <span>${PREHelpers.escapeHtml(c.department)}</span>
        </div>
      </button>
    `,
    )
    .join('');

  dropdown.querySelectorAll('.hom-picker-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const candidate = candidatePatients.find((c) => String(c.preRequestId) === btn.dataset.preRequestId);
      if (!candidate) return;
      fillForm(candidate);
      setPickerVisibility(false);
    });
  });

  setPickerVisibility(true);
}

function fillForm(candidate) {
  selectedCandidate = candidate;
  const { nameInput, patientIdInput } = getPickerElements();
  if (nameInput) nameInput.value = candidate.name;
  if (patientIdInput) patientIdInput.value = candidate.uhid;
  const priority = document.getElementById('priority');
  if (priority) priority.value = candidate.priority;
}

async function populateWards() {
  const select = document.getElementById('wardType');
  if (!select) return;
  const wards = await window.ApiClient.wards.list();
  select.innerHTML =
    '<option value="">HOM decides</option>' +
    wards.map((w) => `<option value="${w.ward_id}">${PREHelpers.escapeHtml(w.ward_name)}</option>`).join('');
}

function bindPicker() {
  const { picker, nameInput } = getPickerElements();
  if (!picker || !nameInput) return;

  nameInput.addEventListener('focus', () => renderDropdown(nameInput.value));
  nameInput.addEventListener('click', () => renderDropdown(nameInput.value));
  nameInput.addEventListener('input', () => {
    selectedCandidate = null;
    document.getElementById('patientId').value = '';
    renderDropdown(nameInput.value);
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setPickerVisibility(false);
  });
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target)) setPickerVisibility(false);
  });
}

async function sendRequest() {
  if (!selectedCandidate) {
    showMessage('Select a patient from the list', 'red');
    return;
  }

  const wardId = document.getElementById('wardType').value;
  const priority = document.getElementById('priority').value;

  try {
    await window.ApiClient.wards.bedRequests.create({
      patient_id: selectedCandidate.patientId,
      pre_request_id: selectedCandidate.preRequestId,
      ward_id: wardId ? Number(wardId) : undefined,
      priority,
    });
    showMessage('Bed request sent to HOM');
  } catch (err) {
    showMessage(err.message || 'Could not send bed request', 'red');
    return;
  }

  document.getElementById('name').value = '';
  document.getElementById('patientId').value = '';
  selectedCandidate = null;
  setPickerVisibility(false);
  renderRequests();
}

async function renderRequests() {
  const pendingTable = document.getElementById('homRequestTable');
  const approvedTable = document.getElementById('homApprovedRequestTable');
  if (!pendingTable || !approvedTable) return;

  await loadCandidates();

  const [bedRequests, patients, wards] = await Promise.all([
    window.ApiClient.wards.bedRequests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.wards.list(),
  ]);
  const patientsById = {};
  patients.forEach((p) => (patientsById[p.patient_id] = p));
  const wardsById = {};
  wards.forEach((w) => (wardsById[w.ward_id] = w));

  const rows = bedRequests.map((r) => {
    const patient = patientsById[r.patient_id] || {};
    return {
      name: patient.name || '-',
      uhid: patient.uhid || '-',
      wardName: r.ward_id ? wardsById[r.ward_id]?.ward_name || '-' : 'HOM decides',
      priority: r.priority,
      status: r.status,
      isApproved: r.status === 'ALLOCATED',
    };
  });

  const pending = rows.filter((r) => !r.isApproved);
  const approved = rows.filter((r) => r.isApproved);

  pendingTable.innerHTML =
    pending.length === 0
      ? `<tr><td colspan="5">No Pending Bed Requests</td></tr>`
      : pending
          .map(
            (r) => `
      <tr>
        <td>${PREHelpers.escapeHtml(r.name)}</td>
        <td>${PREHelpers.escapeHtml(r.uhid)}</td>
        <td><span class="hom-ward-pill">${PREHelpers.escapeHtml(r.wardName)}</span></td>
        <td>${PREHelpers.escapeHtml(r.priority)}</td>
        <td><span class="hom-status-pill">${PREHelpers.escapeHtml(r.status)}</span></td>
      </tr>
    `,
          )
          .join('');

  approvedTable.innerHTML =
    approved.length === 0
      ? `<tr><td colspan="5">No Approved Bed Requests</td></tr>`
      : approved
          .map(
            (r) => `
      <tr>
        <td>${PREHelpers.escapeHtml(r.name)}</td>
        <td>${PREHelpers.escapeHtml(r.uhid)}</td>
        <td><span class="hom-ward-pill">${PREHelpers.escapeHtml(r.wardName)}</span></td>
        <td>${PREHelpers.escapeHtml(r.priority)}</td>
        <td><span class="hom-status-pill hom-status-pill-success">${PREHelpers.escapeHtml(r.status)}</span></td>
      </tr>
    `,
          )
          .join('');
}

async function renderDischargeRequests() {
  const pendingTable = document.getElementById('homDischargePendingTable');
  const approvedTable = document.getElementById('homDischargeApprovedTable');
  if (!pendingTable || !approvedTable) return;

  const [preRequests, patients, doctors, beds] = await Promise.all([
    window.ApiClient.preRequests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.doctors.list(),
    window.ApiClient.wards.beds(),
  ]);
  const doctorsById = {};
  doctors.forEach((d) => (doctorsById[d.doctor_id] = d));
  const bedsById = {};
  beds.forEach((b) => (bedsById[b.bed_id] = b));

  const joined = PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById);
  const pending = joined.filter((r) => r.status === 'DISCHARGE_REQUESTED');
  const approved = joined.filter((r) => r.status === 'DISCHARGE_APPROVED');

  const rowHtml = (r, extra) => `
    <tr>
      <td>${PREHelpers.escapeHtml(r.patientUhid)}</td>
      <td>${PREHelpers.escapeHtml(r.patientName)}</td>
      <td>${PREHelpers.escapeHtml(r.department)}</td>
      <td>${PREHelpers.escapeHtml(r.doctorName)}</td>
      <td>${PREHelpers.escapeHtml(r.visit_type || '-')}</td>
      <td>${PREHelpers.escapeHtml(bedsById[r.bed_id]?.bed_number || '-')}</td>
      ${extra}
    </tr>
  `;

  pendingTable.innerHTML =
    pending.length === 0
      ? `<tr><td colspan="7">No pending discharge requests</td></tr>`
      : pending.map((r) => rowHtml(r, `<td>${PREHelpers.escapeHtml(r.hom_status || 'Awaiting HOM')}</td>`)).join('');

  approvedTable.innerHTML =
    approved.length === 0
      ? `<tr><td colspan="8">No approved discharge requests</td></tr>`
      : approved
          .map((r) => rowHtml(r, `<td>${PREHelpers.escapeHtml(r.hom_status)}</td><td><span class="hom-status-pill">Ready for PRE approval</span></td>`))
          .join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  bindPicker();
  await populateWards();
  await renderRequests();
  await renderDischargeRequests();
});
