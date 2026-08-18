/**
 * beds.js — Phase 3 rewrite.
 *
 * Bed management grid backed by window.ApiClient. Assigning a bed always
 * starts from a real pending bed request (ward/bed-requests, created by
 * PRE) — clicking an available bed opens a picker of compatible pending
 * requests rather than a free-text patient field.
 */

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  await loadAndRender();
});

let activeTab = 'all';
let activeFilter = 'all';
let bedSearchQuery = '';
let bedsData = {};
let currentDetailBedId = null;
let selectedRequestId = null;
let pendingBedTarget = null;

function bindControls() {
  const searchInput = document.getElementById('bed-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      bedSearchQuery = event.target.value.trim().toLowerCase();
      renderPage();
    });
  }
}

async function loadAndRender() {
  const [wards, beds, bedRequests, patients, preRequests] = await Promise.all([
    window.ApiClient.wards.list(),
    window.ApiClient.wards.beds(),
    window.ApiClient.wards.bedRequests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.preRequests.list(),
  ]);
  bedsData = { wards, beds, bedRequests, patients, preRequests };
  renderPage();
}

function renderPage() {
  renderTabs();
  renderFilters();
  renderStats();
  renderWards();
}

function setActiveTab(id) {
  activeTab = id;
  renderPage();
}
function setActiveFilter(id) {
  activeFilter = id;
  renderPage();
}
window.setActiveTab = setActiveTab;
window.setActiveFilter = setActiveFilter;

function renderTabs() {
  const container = document.getElementById('ward-tabs');
  if (!container) return;
  const tabs = [{ id: 'all', label: 'All Beds' }, ...(bedsData.wards || []).map((w) => ({ id: String(w.ward_id), label: w.ward_name }))];
  container.innerHTML = tabs
    .map((tab) => `<button class="tab-btn ${activeTab === tab.id ? 'active' : ''}" onclick="setActiveTab('${tab.id}')">${window.HOMHelpers.escapeHtml(tab.label)}</button>`)
    .join('');
}

function renderFilters() {
  const container = document.getElementById('status-filters');
  if (!container) return;
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'AVAILABLE', label: 'Available' },
    { id: 'OCCUPIED', label: 'Occupied' },
    { id: 'MAINTENANCE', label: 'Maintenance' },
  ];
  container.innerHTML = filters
    .map((f) => `<button class="pill-btn ${activeFilter === f.id ? 'active' : ''}" onclick="setActiveFilter('${f.id}')">${f.label}</button>`)
    .join('');
}

function renderStats() {
  const beds = bedsData.beds || [];
  const total = beds.length;
  const available = beds.filter((b) => b.status === 'AVAILABLE').length;
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const maintenance = beds.filter((b) => b.status === 'MAINTENANCE').length;

  document.getElementById('stats-container').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Beds</div><div class="stat-value" style="color: var(--text-primary);">${total}</div></div>
    <div class="stat-card"><div class="stat-label">Available</div><div class="stat-value" style="color: var(--success);">${available}</div></div>
    <div class="stat-card"><div class="stat-label">Occupied</div><div class="stat-value" style="color: var(--warning);">${occupied}</div></div>
    <div class="stat-card"><div class="stat-label">Maintenance</div><div class="stat-value" style="color: var(--text-secondary);">${maintenance}</div></div>
  `;
}

function patientForBed(bedId) {
  const request = (bedsData.preRequests || []).find((r) => r.bed_id === bedId && ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'].includes(r.status));
  if (!request) return null;
  const patient = (bedsData.patients || []).find((p) => p.patient_id === request.patient_id);
  return patient ? { patient, request } : null;
}

function bedMatchesSearch(bed, linked) {
  if (!bedSearchQuery) return true;
  const haystack = [bed.bed_number, linked?.patient.uhid || '', linked?.patient.name || ''].join(' ').toLowerCase();
  return haystack.includes(bedSearchQuery);
}

function renderWards() {
  const container = document.getElementById('wards-container');
  if (!container) return;

  const wards = (bedsData.wards || []).filter((w) => activeTab === 'all' || String(w.ward_id) === activeTab);
  let html = '';

  wards.forEach((ward) => {
    const wardBeds = (bedsData.beds || [])
      .filter((b) => b.ward_id === ward.ward_id)
      .filter((b) => activeFilter === 'all' || b.status === activeFilter)
      .filter((b) => bedMatchesSearch(b, patientForBed(b.bed_id)));

    if (!wardBeds.length) return;

    const occupied = (bedsData.beds || []).filter((b) => b.ward_id === ward.ward_id && b.status === 'OCCUPIED').length;
    const available = (bedsData.beds || []).filter((b) => b.ward_id === ward.ward_id && b.status === 'AVAILABLE').length;
    const total = (bedsData.beds || []).filter((b) => b.ward_id === ward.ward_id).length;

    html += `
      <div class="ward-section">
        <div class="ward-header">
          <div>
            <h2 class="h2" style="font-size: 18px;">${window.HOMHelpers.escapeHtml(ward.ward_name)}</h2>
            <p class="body-text" style="font-size: 14px; margin-top: 4px;">${total} beds | ${occupied} Occupied | ${available} Available</p>
          </div>
        </div>
        <div class="bed-grid">
    `;

    wardBeds.forEach((bed) => {
      const style = window.HOMHelpers.bedStyle(bed.status);
      const linked = patientForBed(bed.bed_id);
      const subtitle = linked ? `${linked.patient.name} (${linked.patient.uhid})` : style.label;
      const onClick = bed.status === 'AVAILABLE' ? `openAssignModal(${bed.bed_id})` : `openDetailModal(${bed.bed_id})`;

      html += `
        <button class="bed-card" style="background-color: ${style.bg}; border-color: ${style.border}; color: ${style.text};" onclick="${onClick}">
          <div class="bed-card-title">${window.HOMHelpers.escapeHtml(bed.bed_number)}</div>
          <div class="bed-card-subtitle">${window.HOMHelpers.escapeHtml(subtitle)}</div>
        </button>
      `;
    });

    html += '</div></div>';
  });

  container.innerHTML = html || `<div class="ward-section"><p style="margin: 0; color: var(--text-secondary);">No beds match the current filters.</p></div>`;
}

// closeModals() now lives in hom-helpers.js (window.closeModals) — see that
// file for why removing this file's duplicate copy is safe: every
// open*Modal() below re-initializes currentDetailBedId/selectedRequestId/
// pendingBedTarget itself before showing a modal, so the extra resets this
// duplicate used to do on close were already redundant.

window.openAssignModal = function (bedId) {
  pendingBedTarget = (bedsData.beds || []).find((b) => b.bed_id === bedId);
  if (!pendingBedTarget) return;
  selectedRequestId = null;

  const patientsById = {};
  (bedsData.patients || []).forEach((p) => (patientsById[p.patient_id] = p));
  const preRequestsById = {};
  (bedsData.preRequests || []).forEach((r) => (preRequestsById[r.pre_request_id] = r));

  const compatible = (bedsData.bedRequests || []).filter(
    (r) => r.status === 'PENDING' && (!r.ward_id || r.ward_id === pendingBedTarget.ward_id),
  );

  const container = document.getElementById('modal-available-beds');
  if (!container) return;

  container.innerHTML = compatible.length
    ? compatible
        .map((r) => {
          const patient = patientsById[r.patient_id] || {};
          const dept = r.pre_request_id ? preRequestsById[r.pre_request_id]?.department : null;
          return `
        <button type="button" class="modal-bed-btn" onclick="selectPendingRequest(${r.bed_request_id})" id="modal-req-${r.bed_request_id}" style="padding: 16px; border-radius: 8px; border: 2px solid var(--border); background: white; text-align: left; cursor: pointer; grid-column: 1 / -1;">
          <div style="font-weight: 600; font-size: 14px;">${window.HOMHelpers.escapeHtml(patient.name || '-')}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${window.HOMHelpers.escapeHtml(patient.uhid || '-')} • ${window.HOMHelpers.escapeHtml(dept || 'General')} • ${window.HOMHelpers.escapeHtml(r.priority || 'NORMAL')}</div>
        </button>
      `;
        })
        .join('')
    : `<p style="grid-column: 1 / -1; color: var(--text-secondary); margin: 0;">No pending bed requests for this ward.</p>`;

  document.getElementById('assign-bed-error').style.display = 'none';
  document.getElementById('assign-patient-hint').textContent = `Assigning bed ${pendingBedTarget.bed_number}. Select a pending request below.`;
  document.getElementById('modal-assign-bed').classList.add('active');
};

window.selectPendingRequest = function (bedRequestId) {
  selectedRequestId = bedRequestId;
  document.querySelectorAll('.modal-bed-btn').forEach((btn) => {
    btn.style.borderColor = 'var(--border)';
    btn.style.backgroundColor = 'white';
  });
  const selected = document.getElementById(`modal-req-${bedRequestId}`);
  if (selected) {
    selected.style.borderColor = 'var(--primary)';
    selected.style.backgroundColor = 'var(--primary-light)';
  }
};

window.confirmBedAllocation = async function () {
  if (!pendingBedTarget) return;
  if (!selectedRequestId) {
    const el = document.getElementById('assign-bed-error');
    el.textContent = 'Select a pending bed request before confirming.';
    el.style.display = 'block';
    return;
  }

  try {
    await window.ApiClient.wards.bedRequests.allocate(selectedRequestId, pendingBedTarget.bed_id);
  } catch (err) {
    const el = document.getElementById('assign-bed-error');
    el.textContent = err.message || 'Unable to allocate this bed.';
    el.style.display = 'block';
    return;
  }

  closeModals();
  await loadAndRender();
};

window.openDetailModal = function (bedId) {
  const bed = (bedsData.beds || []).find((b) => b.bed_id === bedId);
  if (!bed) return;
  const ward = (bedsData.wards || []).find((w) => w.ward_id === bed.ward_id);
  const linked = patientForBed(bedId);

  currentDetailBedId = bedId;

  document.getElementById('detail-title').innerText = `Bed Details - ${bed.bed_number}`;
  document.getElementById('detail-badge').innerHTML = window.UI.Badge({ variant: bed.status === 'OCCUPIED' ? 'error' : 'neutral', children: window.HOMHelpers.bedStyle(bed.status).label });
  document.getElementById('detail-patient').innerText = linked ? linked.patient.name : 'Not linked to an active patient';
  document.getElementById('detail-uhid').innerText = linked ? linked.patient.uhid : '-';
  document.getElementById('detail-dept').innerText = linked ? linked.request.department || '-' : '-';
  document.getElementById('detail-ward').innerText = ward ? ward.ward_name : '-';
  document.getElementById('detail-physician').innerText = linked && linked.request.doctor_id ? `Doctor #${linked.request.doctor_id}` : '-';
  const since = document.getElementById('detail-since');
  if (since) since.innerText = linked ? `Since: ${window.HOMHelpers.formatDate(linked.request.decided_at || linked.request.updated_at)}` : '';
  document.getElementById('modal-bed-detail').classList.add('active');
};

window.viewInPatientFlow = function () {
  if (!currentDetailBedId) return;
  window.location.href = 'screen-03-patient-flow.html';
};
