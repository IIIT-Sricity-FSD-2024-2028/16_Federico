'use strict';

/**
 * PRE/js/hom.js — Hospital Operations Management Coordination.
 * Bidirectional bed dispatching, capacity tracking, and discharge clearance.
 */

let candidatePatients = [];
let selectedCandidate = null;
let pickerOpen = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// ── DATA FETCHING (Zero Hardcoded Data) ───────────────────
async function loadCandidates() {
  const [preRequests, patients, bedRequests] = await Promise.all([
    window.ApiClient.preRequests.list().catch(() => []),
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.wards.bedRequests.list().catch(() => []),
  ]);

  const patientsById = {};
  (patients || []).forEach((p) => (patientsById[p.patient_id] = p));

  const activeBedReqPreIds = new Set(
    (bedRequests || []).filter((r) => r.status === 'PENDING' || r.status === 'ALLOCATED').map((r) => r.pre_request_id),
  );

  candidatePatients = (preRequests || [])
    .filter(
      (r) =>
        ((r.status === 'APPROVED' && r.visit_type === 'Admit') || r.status === 'EMERGENCY') &&
        !activeBedReqPreIds.has(r.pre_request_id),
    )
    .map((r) => {
      const patient = patientsById[r.patient_id] || {};
      return {
        preRequestId: r.pre_request_id,
        patientId: r.patient_id,
        uhid: patient.uhid || `UHID-${r.patient_id}`,
        name: patient.name || 'Unknown Patient',
        department: r.department || 'General Medicine',
        visitType: r.visit_type || (r.status === 'EMERGENCY' ? 'Emergency' : 'Admit'),
        priority: r.visit_type === 'Emergency' || r.status === 'EMERGENCY' ? 'CRITICAL' : 'NORMAL',
      };
    });
}

function renderDropdown(query) {
  const { dropdown } = getPickerElements();
  if (!dropdown) return;

  const q = String(query || '').trim().toLowerCase();
  const matches = candidatePatients.filter((c) => !q || `${c.uhid} ${c.name} ${c.department}`.toLowerCase().includes(q));

  if (matches.length === 0) {
    dropdown.innerHTML = `
      <div class="appointment-picker-empty">
        <strong>No patients awaiting a bed</strong>
        <span>To request a bed, ensure an admitted or emergency case is registered.</span>
      </div>
    `;
    setPickerVisibility(true);
    return;
  }

  dropdown.innerHTML = matches
    .map(
      (c) => `
      <button type="button" class="appointment-picker-option" data-pre-request-id="${c.preRequestId}">
        <div class="appointment-picker-row">
          <strong>${escapeHtml(c.name)}</strong>
          <span style="font-size:11px; color:var(--md-primary, #0f766e); font-weight:600;">${escapeHtml(c.uhid)}</span>
        </div>
        <div class="appointment-picker-row appointment-picker-meta">
          <span>${escapeHtml(c.department)}</span>
          <span style="font-weight:600; color:${c.priority === 'CRITICAL' ? 'var(--status-error)' : 'var(--color-muted-fg)'};">${escapeHtml(c.visitType)}</span>
        </div>
      </button>
    `,
    )
    .join('');

  dropdown.querySelectorAll('.appointment-picker-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const candidate = candidatePatients.find((c) => String(c.preRequestId) === btn.dataset.preRequestId);
      if (!candidate) return;
      fillForm(candidate);
      setPickerVisibility(false);
    });
  });

  setPickerVisibility(true);
}

let wardsCatalog = [];

function fillForm(candidate) {
  selectedCandidate = candidate;
  const { nameInput, patientIdInput } = getPickerElements();
  if (nameInput) nameInput.value = `${candidate.name} (${candidate.uhid})`;
  if (patientIdInput) patientIdInput.value = candidate.uhid;

  const priority = document.getElementById('priority');
  if (priority) priority.value = candidate.priority;

  const cardName = document.getElementById('homCardPatientName');
  const cardUhid = document.getElementById('homCardPatientUhid');
  const cardDept = document.getElementById('homCardDept');
  const cardVisit = document.getElementById('homCardVisit');

  if (cardName) cardName.innerText = candidate.name;
  if (cardUhid) cardUhid.innerText = candidate.uhid;
  if (cardDept) cardDept.innerText = candidate.department;
  if (cardVisit) cardVisit.innerText = candidate.visitType;

  // Auto-select smart matching ward based on clinical department
  const wardSelect = document.getElementById('wardType');
  if (wardSelect && wardsCatalog.length > 0) {
    const deptLower = String(candidate.department || '').toLowerCase();
    const matchedWard = wardsCatalog.find((w) => {
      const wName = String(w.ward_name).toLowerCase();
      if (deptLower.includes('pediatr') && wName.includes('pediatr')) return true;
      if ((deptLower.includes('cardio') || deptLower.includes('heart')) && (wName.includes('cardiac') || wName.includes('icu'))) return true;
      if ((deptLower.includes('matern') || deptLower.includes('gynec') || deptLower.includes('obstet')) && wName.includes('matern')) return true;
      if (deptLower.includes('icu') && wName.includes('icu')) return true;
      return false;
    });
    if (matchedWard) {
      wardSelect.value = String(matchedWard.ward_id);
    } else {
      wardSelect.value = '';
    }
  }
}

function clearHomForm() {
  selectedCandidate = null;
  const { nameInput, patientIdInput } = getPickerElements();
  if (nameInput) nameInput.value = '';
  if (patientIdInput) patientIdInput.value = '';

  const cardName = document.getElementById('homCardPatientName');
  const cardUhid = document.getElementById('homCardPatientUhid');
  const cardDept = document.getElementById('homCardDept');
  const cardVisit = document.getElementById('homCardVisit');

  if (cardName) cardName.innerText = 'No Patient Selected';
  if (cardUhid) cardUhid.innerText = '—';
  if (cardDept) cardDept.innerText = '—';
  if (cardVisit) cardVisit.innerText = '—';

  const wardEl = document.getElementById('wardType');
  if (wardEl) wardEl.value = '';
  const priorityEl = document.getElementById('priority');
  if (priorityEl) priorityEl.value = 'NORMAL';

  setPickerVisibility(false);
}

async function populateWards() {
  const select = document.getElementById('wardType');
  if (!select) return;
  wardsCatalog = await window.ApiClient.wards.list().catch(() => []);
  select.innerHTML =
    '<option value="">HOM Decides Best Ward</option>' +
    (wardsCatalog || []).map((w) => `<option value="${w.ward_id}">${escapeHtml(w.ward_name)} (${w.total_beds || 0} Beds)</option>`).join('');
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

// ── SEND BED REQUEST (PRE to HOM Dispatcher) ────────────
async function sendRequest() {
  if (!selectedCandidate) {
    UIFeedback.toast('Please select a verified patient from the queue first', 'error');
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
    UIFeedback.toast(`Bed request dispatched to HOM for ${selectedCandidate.name}`, 'success');
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not dispatch bed request', 'error');
    return;
  }

  clearHomForm();
  await loadAndRenderAll();
}

// ── RENDER BED REQUESTS TABLE ────────────────────────────
async function renderRequests() {
  const table = document.getElementById('homRequestTable');
  if (!table) return;

  const [bedRequests, patients, wards, beds] = await Promise.all([
    window.ApiClient.wards.bedRequests.list().catch(() => []),
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.wards.list().catch(() => []),
    window.ApiClient.wards.beds().catch(() => []),
  ]);

  const patientsById = {};
  (patients || []).forEach((p) => (patientsById[p.patient_id] = p));
  const wardsById = {};
  (wards || []).forEach((w) => (wardsById[w.ward_id] = w));
  const bedsById = {};
  (beds || []).forEach((b) => (bedsById[b.bed_id] = b));

  if (!bedRequests || bedRequests.length === 0) {
    table.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:28px; color:var(--color-muted-fg);">No active bed allocation requests</td></tr>`;
    return;
  }

  table.innerHTML = bedRequests
    .map((r) => {
      const patient = patientsById[r.patient_id] || {};
      const wardName = r.ward_id ? wardsById[r.ward_id]?.ward_name || 'Ward Assigned' : 'HOM Decides';
      const allocatedBed = r.bed_id ? bedsById[r.bed_id] : null;

      let priorityBadge = `<span style="display:inline-block; padding:2px 8px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc; font-size:11px; font-weight:600; color:#475569;">Normal</span>`;
      if (r.priority === 'CRITICAL') {
        priorityBadge = `<span style="display:inline-block; padding:2px 8px; border-radius:12px; border:1px solid #fecaca; background:#fef2f2; font-size:11px; font-weight:700; color:#991b1b;">Critical</span>`;
      } else if (r.priority === 'HIGH') {
        priorityBadge = `<span style="display:inline-block; padding:2px 8px; border-radius:12px; border:1px solid #fde68a; background:#fef3c7; font-size:11px; font-weight:700; color:#b45309;">High</span>`;
      }

      let statusBadge = `<span class="status pending" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:11px; padding:3px 8px; border-radius:12px;">Awaiting Allocation</span>`;
      if (r.status === 'ALLOCATED') {
        statusBadge = `<span class="status confirmed" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-weight:600; font-size:11px; padding:3px 8px; border-radius:12px;">Allocated: ${PREHelpers.escapeHtml(allocatedBed ? allocatedBed.bed_number : 'Bed #' + r.bed_id)}</span>`;
      }

      return `
        <tr>
          <td style="text-align:left; padding:12px 16px;">
            <strong style="color:var(--md-primary, #0f766e);">${PREHelpers.escapeHtml(patient.uhid || 'UHID-' + r.patient_id)}</strong>
          </td>
          <td style="text-align:left; padding:12px 16px;">
            <strong>${PREHelpers.escapeHtml(patient.name || '—')}</strong>
          </td>
          <td style="text-align:left; padding:12px 16px;">${PREHelpers.escapeHtml(wardName)}</td>
          <td style="text-align:center; padding:12px 14px;">${priorityBadge}</td>
          <td style="text-align:center; padding:12px 14px;">${statusBadge}</td>
        </tr>
      `;
    })
    .join('');
}

// ── RENDER DISCHARGE CLEARANCE TABLE ─────────────────────
async function renderDischargeRequests() {
  const table = document.getElementById('homDischargeTable');
  if (!table) return;

  const [preRequests, patients, doctors, beds] = await Promise.all([
    window.ApiClient.preRequests.list().catch(() => []),
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.doctors.list().catch(() => []),
    window.ApiClient.wards.beds().catch(() => []),
  ]);

  const doctorsById = {};
  (doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));
  const bedsById = {};
  (beds || []).forEach((b) => (bedsById[b.bed_id] = b));

  const joined = PREHelpers.joinPreRequestsWithPatients(preRequests, patients, doctorsById);
  const dischargeList = joined.filter(
    (r) => r.status === 'DISCHARGE_REQUESTED' || r.status === 'DISCHARGE_APPROVED',
  );

  if (dischargeList.length === 0) {
    table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:28px; color:var(--color-muted-fg);">No pending discharge clearance requests</td></tr>`;
    return;
  }

  table.innerHTML = dischargeList
    .map((r) => {
      const bedNumber = r.bed_id && bedsById[r.bed_id] ? bedsById[r.bed_id].bed_number : 'Bed Assigned';

      let statusBadge = `<span class="status pending" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:11px; padding:3px 8px; border-radius:12px;">Pending HOM Inspection</span>`;
      let actionHtml = `<span style="color:var(--color-muted-fg); font-size:12px;">Awaiting HOM</span>`;

      if (r.status === 'DISCHARGE_APPROVED') {
        statusBadge = `<span class="status confirmed" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-size:11px; padding:3px 8px; border-radius:12px;">Discharge Approved by HOM</span>`;
        actionHtml = `<button class="btn green" type="button" style="padding:6px 12px; font-size:11px; border-radius:4px;" onclick="finalizeDischarge(${r.pre_request_id})">Finalize Release</button>`;
      }

      return `
        <tr>
          <td style="text-align:left; padding:12px 16px;">
            <strong style="color:var(--md-primary, #0f766e);">${PREHelpers.escapeHtml(r.patientUhid)}</strong>
          </td>
          <td style="text-align:left; padding:12px 16px;">
            <strong>${PREHelpers.escapeHtml(r.patientName)}</strong>
          </td>
          <td style="text-align:left; padding:12px 16px;">${PREHelpers.escapeHtml(r.department)}</td>
          <td style="text-align:left; padding:12px 16px;">${PREHelpers.escapeHtml(r.doctorName)}</td>
          <td style="text-align:center; padding:12px 14px;">
            <span class="hom-ward-pill">${PREHelpers.escapeHtml(bedNumber)}</span>
          </td>
          <td style="text-align:center; padding:12px 14px;">${statusBadge}</td>
          <td style="text-align:center; padding:12px 16px;">${actionHtml}</td>
        </tr>
      `;
    })
    .join('');
}

// ── FINALIZE DISCHARGE & RELEASE PATIENT ─────────────────
async function finalizeDischarge(preRequestId) {
  try {
    await window.ApiClient.preRequests.update(preRequestId, { status: 'DISCHARGED' });
    UIFeedback.toast('Patient discharge finalized and released successfully', 'success');
  } catch (err) {
    UIFeedback.toast(err.message || 'Could not finalize discharge', 'error');
    return;
  }

  await loadAndRenderAll();
}

async function loadAndRenderAll() {
  await Promise.all([
    loadCandidates(),
    renderRequests(),
    renderDischargeRequests(),
  ]);
}

window.sendRequest = sendRequest;
window.finalizeDischarge = finalizeDischarge;
window.clearHomForm = clearHomForm;

document.addEventListener('DOMContentLoaded', async () => {
  bindPicker();
  await populateWards();
  await loadAndRenderAll();
});

