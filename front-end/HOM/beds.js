'use strict';

/**
 * beds.js — HOM Bed Management & Allocation.
 */

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  await loadAndRender();

  // Auto-refresh bed status every 15 seconds
  setInterval(() => {
    if (!document.hidden) loadAndRender();
  }, 15000);

  // Instant refresh on tab focus
  window.addEventListener('focus', () => {
    loadAndRender();
  });
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
  const [wards, beds, bedRequests, patients, preRequests, doctors] = await Promise.all([
    window.ApiClient.wards.list().catch(() => []),
    window.ApiClient.wards.beds().catch(() => []),
    window.ApiClient.wards.bedRequests.list().catch(() => []),
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.preRequests.list().catch(() => []),
    window.ApiClient.doctors.list().catch(() => []),
  ]);
  bedsData = {
    wards: Array.isArray(wards) ? wards : [],
    beds: Array.isArray(beds) ? beds : [],
    bedRequests: Array.isArray(bedRequests) ? bedRequests : [],
    patients: Array.isArray(patients) ? patients : [],
    preRequests: Array.isArray(preRequests) ? preRequests : [],
    doctors: Array.isArray(doctors) ? doctors : [],
  };
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

  const beds = bedsData.beds || [];
  const total = beds.length;
  const available = beds.filter((b) => b.status === 'AVAILABLE').length;
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const maintenance = beds.filter((b) => b.status === 'MAINTENANCE').length;

  const filters = [
    { id: 'all', label: `All (${total})` },
    { id: 'AVAILABLE', label: `Available (${available})` },
    { id: 'OCCUPIED', label: `Occupied (${occupied})` },
    { id: 'MAINTENANCE', label: `Maintenance (${maintenance})` },
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
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Total Beds</div>
        <div class="kpi-value">${total}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: 'neutral', children: 'All Registered' })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Available Beds</div>
        <div class="kpi-value" style="color: var(--status-success-fg, #1b5e20);">${available}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: 'success', children: 'Ready for Admission' })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Occupied Beds</div>
        <div class="kpi-value" style="color: var(--status-warning-fg, #7a5300);">${occupied}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: 'warning', children: 'In Active Care' })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Under Maintenance</div>
        <div class="kpi-value" style="color: var(--text-secondary);">${maintenance}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: 'neutral', children: 'Out of Service' })}
      </div>
    </div>
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
  const haystack = [bed.bed_number, linked?.patient.uhid || '', linked?.patient.name || '', linked?.request.department || ''].join(' ').toLowerCase();
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
            <p class="body-text" style="font-size: 13px; margin-top: 4px;">${total} beds total · <strong style="color: var(--warning);">${occupied} Occupied</strong> · <strong style="color: var(--success);">${available} Available</strong></p>
          </div>
        </div>
        <div class="bed-scroll-container">
          <div class="bed-grid">
    `;

    wardBeds.forEach((bed) => {
      const style = window.HOMHelpers.bedStyle(bed.status);
      const linked = patientForBed(bed.bed_id);
      const subtitle = linked ? `${linked.patient.name}` : style.label;

      html += `
        <button class="bed-card" style="background-color: ${style.bg}; border-color: ${style.border}; color: ${style.text};" onclick="openDetailModal(${bed.bed_id})" title="Click to view bed details">
          <div class="bed-card-title">${window.HOMHelpers.escapeHtml(bed.bed_number)}</div>
          <div class="bed-card-subtitle">${window.HOMHelpers.escapeHtml(subtitle)}</div>
        </button>
      `;
    });

    html += '</div></div></div>';
  });

  container.innerHTML = html || `<div class="ward-section"><p style="margin: 0; color: var(--text-secondary);">No beds match the current search or filters.</p></div>`;
}

window.openAssignModal = function (bedId) {
  closeModals();
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
        <button type="button" class="modal-bed-btn" onclick="selectPendingRequest(${r.bed_request_id})" id="modal-req-${r.bed_request_id}" style="padding: 14px 16px; border-radius: var(--radius-base); border: 1px solid var(--border); background: var(--surface); text-align: left; cursor: pointer; transition: all 0.2s;">
          <div style="font-weight: 600; font-size: 14px; color: var(--text);">${window.HOMHelpers.escapeHtml(patient.name || '-')}</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">${window.HOMHelpers.escapeHtml(patient.uhid || '-')} • ${window.HOMHelpers.escapeHtml(dept || 'General')} • Priority: ${window.HOMHelpers.escapeHtml(r.priority || 'NORMAL')}</div>
        </button>
      `;
        })
        .join('')
    : `<p style="color: var(--text-secondary); margin: 0; padding: 12px 0;">No pending bed requests queued for this ward.</p>`;

  document.getElementById('assign-bed-error').style.display = 'none';
  document.getElementById('assign-patient-hint').textContent = `Assigning Bed ${pendingBedTarget.bed_number}. Select an incoming patient request:`;
  if (typeof window.openModal === 'function') {
    window.openModal('modal-assign-bed');
  } else {
    document.getElementById('modal-assign-bed')?.classList.add('active');
    document.body.classList.add('modal-open');
  }
};

window.selectPendingRequest = function (bedRequestId) {
  selectedRequestId = bedRequestId;
  document.querySelectorAll('.modal-bed-btn').forEach((btn) => {
    btn.style.borderColor = 'var(--border)';
    btn.style.backgroundColor = 'var(--surface)';
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
    el.textContent = 'Please select a pending patient bed request before confirming.';
    el.style.display = 'block';
    return;
  }

  try {
    await window.ApiClient.wards.bedRequests.allocate(selectedRequestId, pendingBedTarget.bed_id);
    window.UIFeedback?.toast('Bed allocated and patient admitted successfully.', 'success');
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
  const doctorsById = {};
  (bedsData.doctors || []).forEach((d) => (doctorsById[d.doctor_id] = d));

  currentDetailBedId = bedId;

  document.getElementById('detail-title').innerText = `Bed Details — ${bed.bed_number}`;
  document.getElementById('detail-ward').innerText = ward ? ward.ward_name : '-';
  document.getElementById('detail-number').innerText = bed.bed_number || '-';

  const patientSection = document.getElementById('detail-patient-section');
  const vacantSection = document.getElementById('detail-vacant-section');
  const actionBtn = document.getElementById('detail-action-btn');
  const statusBtn = document.getElementById('detail-status-btn');
  const badgeEl = document.getElementById('detail-badge');
  const sinceEl = document.getElementById('detail-since');

  if (bed.status === 'OCCUPIED' && linked) {
    if (patientSection) patientSection.style.display = 'block';
    if (vacantSection) vacantSection.style.display = 'none';
    if (statusBtn) statusBtn.style.display = 'none';

    badgeEl.innerHTML = window.UI.Badge({ variant: 'error', children: 'OCCUPIED' });
    if (sinceEl) {
      sinceEl.innerText = `Admitted: ${window.HOMHelpers.formatDateTime(linked.request.decided_at || linked.request.updated_at || bed.updated_at)}`;
    }

    document.getElementById('detail-patient').innerText = linked.patient.name || '-';
    document.getElementById('detail-uhid').innerText = linked.patient.uhid || '-';
    document.getElementById('detail-dept').innerText = linked.request.department || 'General';

    const doctor = linked.request.doctor_id ? doctorsById[linked.request.doctor_id] : null;
    document.getElementById('detail-physician').innerText = doctor ? `Dr. ${doctor.name}` : linked.request.doctor_id ? `Doctor #${linked.request.doctor_id}` : 'Staff Physician';

    if (actionBtn) {
      actionBtn.style.display = 'inline-flex';
      actionBtn.innerText = 'View in Patient Flow';
      actionBtn.onclick = window.viewInPatientFlow;
    }
  } else if (bed.status === 'AVAILABLE') {
    if (patientSection) patientSection.style.display = 'none';
    if (vacantSection) vacantSection.style.display = 'block';

    badgeEl.innerHTML = window.UI.Badge({ variant: 'success', children: 'AVAILABLE · Not Occupied' });
    if (sinceEl) sinceEl.innerText = 'Status: Vacant & Clean';

    if (statusBtn) {
      statusBtn.style.display = 'inline-flex';
      statusBtn.innerText = 'Mark as Under Maintenance';
    }

    const compatibleRequests = (bedsData.bedRequests || []).filter(
      (r) => r.status === 'PENDING' && (!r.ward_id || r.ward_id === bed.ward_id),
    );

    if (actionBtn) {
      if (compatibleRequests.length > 0) {
        actionBtn.style.display = 'inline-flex';
        actionBtn.innerText = `Assign Patient (${compatibleRequests.length} Waiting)`;
        actionBtn.onclick = () => window.openAssignModal(bed.bed_id);
      } else {
        actionBtn.style.display = 'none';
      }
    }
  } else {
    // MAINTENANCE
    if (patientSection) patientSection.style.display = 'none';
    if (vacantSection) {
      vacantSection.style.display = 'block';
      vacantSection.innerHTML = `
        <h3 class="h3" style="font-size: 14px; margin-bottom: 6px; color: var(--text-secondary);">Bed Under Maintenance</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">This bed is temporarily offline for maintenance or sanitation.</p>
      `;
    }
    badgeEl.innerHTML = window.UI.Badge({ variant: 'neutral', children: 'UNDER MAINTENANCE' });
    if (sinceEl) sinceEl.innerText = 'Status: Maintenance';

    if (statusBtn) {
      statusBtn.style.display = 'inline-flex';
      statusBtn.innerText = 'Mark as Available';
    }

    if (actionBtn) actionBtn.style.display = 'none';
  }

  if (typeof window.openModal === 'function') {
    window.openModal('modal-bed-detail');
  } else {
    document.getElementById('modal-bed-detail')?.classList.add('active');
    document.body.classList.add('modal-open');
  }
};

window.toggleCurrentBedMaintenance = async function () {
  if (!currentDetailBedId) return;
  const bed = (bedsData.beds || []).find((b) => b.bed_id === currentDetailBedId);
  if (!bed) return;
  const targetStatus = bed.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
  try {
    await window.ApiClient.wards.updateBedStatus(currentDetailBedId, targetStatus);
    window.UIFeedback?.toast(`Bed ${bed.bed_number} status updated to ${targetStatus}.`, 'success');
    closeModals();
    await loadAndRender();
  } catch (err) {
    window.UIFeedback?.toast(err.message || 'Failed to update bed status', 'error');
  }
};

window.viewInPatientFlow = function () {
  if (!currentDetailBedId) return;
  window.location.href = 'screen-03-patient-flow.html';
};

