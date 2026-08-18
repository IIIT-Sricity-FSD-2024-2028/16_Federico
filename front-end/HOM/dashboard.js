/**
 * dashboard.js — Phase 3 rewrite.
 *
 * Real operational overview backed by window.ApiClient. Bed assignment
 * only ever happens against a real pending bed request (created by PRE
 * via ward/bed-requests) — there is no more "type a patient name into a
 * free-text box and assign a bed" path, which in the old app could
 * assign a bed to a string with no real patient/admission behind it.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const roleBadge = document.getElementById('role-badge');
  if (roleBadge) {
    const profile = window.RoleAccess?.getProfile?.();
    const label = profile?.accessRole === 'SUPER_USER' ? 'Super User · Full CRUD Access' : 'Hospital Operations Manager';
    roleBadge.innerHTML = window.UI.Badge({ variant: 'info', children: label });
  }

  initializeDashboardControls();
  await renderDashboard();
});

let currentWardFilter = 'ALL';
let currentStatusFilter = 'ALL';
let selectedBedRequestId = null;
let selectedBedId = null;

function showMessage(message, type = 'error') {
  window.UIFeedback.toast(message, type);
}

function initializeDashboardControls() {
  document.querySelector('[data-flow="goto-full-reports"]')?.addEventListener('click', () => {
    window.location.href = 'screen-05-billing.html';
  });
  document.querySelector('[data-flow="goto-patient-flow"]')?.addEventListener('click', () => {
    window.location.href = 'screen-03-patient-flow.html';
  });
  document.querySelector('[data-flow="goto-inventory"]')?.addEventListener('click', () => {
    window.location.href = 'screen-04-inventory.html';
  });
  document.querySelector('[data-flow="open-alerts-panel"]')?.addEventListener('click', () => {
    document.getElementById('activity-log-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.querySelector('[data-flow="open-discharge-queue-modal"]')?.addEventListener('click', () => {
    document.getElementById('pre-discharge-body')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.querySelector('[data-flow="open-generate-report-modal"]')?.addEventListener('click', () => {
    window.location.href = 'screen-05-billing.html';
  });

  document.querySelector('[data-flow="ward-filter"]')?.addEventListener('click', async () => {
    const wards = dashboardData.wards || [];
    const states = ['ALL', ...wards.map((w) => String(w.ward_id))];
    const idx = states.indexOf(currentWardFilter);
    currentWardFilter = states[(idx + 1) % states.length];
    renderBedRegistry(dashboardData);
  });
  document.querySelector('[data-flow="status-filter"]')?.addEventListener('click', () => {
    const states = ['ALL', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
    currentStatusFilter = states[(states.indexOf(currentStatusFilter) + 1) % states.length];
    renderBedRegistry(dashboardData);
  });
}

let dashboardData = {};

async function loadDashboardData() {
  const [preRequests, patients, wards, beds, bedRequests, activity, ledgers] = await Promise.all([
    window.ApiClient.preRequests.list(),
    window.ApiClient.patients.list(),
    window.ApiClient.wards.list(),
    window.ApiClient.wards.beds(),
    window.ApiClient.wards.bedRequests.list(),
    window.ApiClient.activityLog.list(),
    window.ApiClient.billing.ledger.listAll().catch(() => []),
  ]);
  return { preRequests, patients, wards, beds, bedRequests, activity, ledgers };
}

async function renderDashboard() {
  dashboardData = await loadDashboardData();

  try {
    renderMetrics(dashboardData);
  } catch (e) {
    console.error('Failed to render metrics:', e);
  }
  try {
    renderBedRegistry(dashboardData);
  } catch (e) {
    console.error('Failed to render bed registry:', e);
  }
  try {
    renderAdmissionsTable(dashboardData);
  } catch (e) {
    console.error('Failed to render admissions:', e);
  }
  try {
    renderWardOccupancy(dashboardData);
  } catch (e) {
    console.error('Failed to render occupancy:', e);
  }
  try {
    renderActivityLog(dashboardData);
  } catch (e) {
    console.error('Failed to render activity log:', e);
  }
  try {
    renderBillingQueue(dashboardData);
  } catch (e) {
    console.error('Failed to render billing queue:', e);
  }
  try {
    await renderDischargeQueue();
  } catch (e) {
    console.error('Failed to render discharge queue:', e);
  }
}

function renderMetrics(data) {
  const beds = data.beds || [];
  const totalBeds = beds.length;
  const available = beds.filter((b) => b.status === 'AVAILABLE').length;
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

  const activeStatuses = ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'];
  const activeInpatients = (data.preRequests || []).filter((r) => activeStatuses.includes(r.status)).length;
  const pendingCount = (data.bedRequests || []).filter((r) => r.status === 'PENDING').length;

  const icons = {
    bed: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    users: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    chart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-4"/></svg>`,
    alert: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  };

  document.getElementById('metrics-container').innerHTML = `
    <div class="card" style="padding: 24px;">
      <div class="metric-card-icon" style="background: #E0F7F6;">${icons.bed}</div>
      <div class="metric-value" style="color: var(--text-primary);">${totalBeds}</div>
      <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Total Beds Managed</div>
      ${window.UI.Badge({ variant: 'neutral', children: `${available} Available · ${occupied} Occupied` })}
    </div>
    <div class="card" style="padding: 24px;">
      <div class="metric-card-icon" style="background: #FEF3C7;">${icons.users}</div>
      <div class="metric-value" style="color: var(--text-primary);">${activeInpatients}</div>
      <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Active Inpatients</div>
      ${window.UI.Badge({ variant: 'success', children: 'Admitted or in discharge flow' })}
    </div>
    <div class="card" style="padding: 24px;">
      <div class="metric-card-icon" style="background: #FEF3C7;">${icons.chart}</div>
      <div class="metric-value" style="color: #F59E0B;">${occupancyRate}%</div>
      <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Bed Occupancy Rate</div>
      ${window.UI.Badge({ variant: occupancyRate >= 90 ? 'error' : occupancyRate >= 75 ? 'warning' : 'success', children: occupancyRate >= 75 ? 'Nearing capacity' : 'Healthy' })}
    </div>
    <div class="card" style="padding: 24px;">
      <div class="metric-card-icon" style="background: #FEE2E2;">${icons.alert}</div>
      <div class="metric-value" style="color: #EF4444;">${pendingCount}</div>
      <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Pending Bed Requests</div>
      ${window.UI.Badge({ variant: pendingCount > 0 ? 'error' : 'success', children: pendingCount > 0 ? 'Requires action' : 'All clear' })}
    </div>
  `;
}

function renderBedRegistry(data) {
  const container = document.getElementById('bed-registry-container');
  if (!container) return;

  const wards = data.wards || [];
  const beds = data.beds || [];
  const visibleWards = currentWardFilter === 'ALL' ? wards : wards.filter((w) => String(w.ward_id) === currentWardFilter);

  let html = '';
  visibleWards.forEach((ward) => {
    const wardBeds = beds
      .filter((b) => b.ward_id === ward.ward_id)
      .filter((b) => currentStatusFilter === 'ALL' || b.status === currentStatusFilter);
    if (!wardBeds.length) return;

    html += `<h3 style="font-size: 14px; font-weight: 500; margin: 0 0 12px 0;">${window.HOMHelpers.escapeHtml(ward.ward_name)}</h3>`;
    html += `<div class="bed-grid">`;
    wardBeds.slice(0, 8).forEach((bed) => {
      const style = window.HOMHelpers.bedStyle(bed.status);
      html += `
        <div class="bed-card" style="background-color: ${style.bg}; border-color: ${style.border}; color: ${style.text}; cursor: default;">
          <div class="bed-card-title">${window.HOMHelpers.escapeHtml(bed.bed_number)}</div>
          <div class="bed-card-subtitle">${style.label}</div>
        </div>
      `;
    });
    html += `</div>`;
  });

  container.innerHTML = html || `<p style="margin:0; color: var(--text-secondary);">No beds match the current filters.</p>`;

  const wardFilterBtn = document.querySelector('[data-flow="ward-filter"]');
  if (wardFilterBtn) {
    const label = currentWardFilter === 'ALL' ? 'All' : wards.find((w) => String(w.ward_id) === currentWardFilter)?.ward_name || 'All';
    wardFilterBtn.textContent = `Ward: ${label} ▼`;
  }
  const statusFilterBtn = document.querySelector('[data-flow="status-filter"]');
  if (statusFilterBtn) statusFilterBtn.textContent = `Status: ${currentStatusFilter === 'ALL' ? 'All' : currentStatusFilter} ▼`;
}

function renderAdmissionsTable(data) {
  const tbody = document.getElementById('admissions-table-body');
  const badgeHeader = document.getElementById('pending-badge-header');
  const patientsById = {};
  (data.patients || []).forEach((p) => (patientsById[p.patient_id] = p));
  const preRequestsById = {};
  (data.preRequests || []).forEach((r) => (preRequestsById[r.pre_request_id] = r));

  const pending = (data.bedRequests || []).filter((r) => r.status === 'PENDING');
  if (badgeHeader) badgeHeader.innerHTML = window.UI.Badge({ variant: 'warning', children: `${pending.length} Pending` });
  if (!tbody) return;

  if (!pending.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">No pending bed requests</td></tr>`;
    return;
  }

  tbody.innerHTML = pending
    .map((request) => {
      const patient = patientsById[request.patient_id] || {};
      const preRequest = request.pre_request_id ? preRequestsById[request.pre_request_id] : null;
      return `
        <tr onclick="openAdmissionModal(${request.bed_request_id})" style="cursor: pointer;">
          <td style="font-weight: 500;">${window.HOMHelpers.escapeHtml(patient.name || '-')}</td>
          <td>${window.HOMHelpers.escapeHtml(patient.uhid || '-')}</td>
          <td>${window.HOMHelpers.escapeHtml(preRequest?.department || '-')}</td>
          <td>${preRequest ? 'PRE' : 'HOM'}</td>
          <td>${window.HOMHelpers.formatDateTime(request.requested_at)}</td>
          <td>${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'Assign Bed' })}</td>
        </tr>
      `;
    })
    .join('');
}

function renderWardOccupancy(data) {
  const container = document.getElementById('occupancy-container');
  if (!container) return;

  const beds = data.beds || [];
  let html = '';
  (data.wards || []).forEach((ward) => {
    const wardBeds = beds.filter((b) => b.ward_id === ward.ward_id);
    const occupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
    const percentage = wardBeds.length > 0 ? Math.round((occupied / wardBeds.length) * 100) : 0;
    let color = '#10B981';
    if (percentage >= 90) color = '#EF4444';
    else if (percentage >= 75) color = '#F59E0B';

    html += `
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px;">
          <span style="font-weight: 500; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(ward.ward_name)}</span>
          <span style="color: var(--text-secondary);">${occupied}/${wardBeds.length} beds (${percentage}%)</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div></div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderActivityLog(data) {
  const container = document.getElementById('activity-log-container');
  if (!container) return;
  const colors = { success: '#10B981', info: '#3B82F6', warning: '#F59E0B', error: '#EF4444' };

  container.innerHTML = (data.activity || []).slice(0, 5).map((log) => `
    <div style="display: flex; gap: 12px; align-items: flex-start;">
      <div style="width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background-color: ${colors[log.type] || colors.info}"></div>
      <div>
        <p style="font-size: 14px; margin: 0; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(log.text)}</p>
        <p style="font-size: 12px; margin: 2px 0 0 0; color: var(--text-muted);">${window.HOMHelpers.formatDateTime(log.created_at)}</p>
      </div>
    </div>
  `).join('') || `<p style="margin:0; color: var(--text-secondary); font-size: 14px;">No activity recorded yet.</p>`;
}

function renderBillingQueue(data) {
  const tbody = document.getElementById('dispatch-queue-body');
  const badge = document.getElementById('dispatch-queue-badge');
  if (!tbody || !badge) return;

  const dispatched = (data.ledgers || []).filter((l) => l.status === 'DISPATCHED' || l.status === 'PAID');
  badge.innerHTML = window.UI.Badge({ variant: dispatched.length ? 'warning' : 'neutral', children: `${dispatched.length} Dispatched` });

  if (!dispatched.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px;">No bills dispatched by FA yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = dispatched
    .slice(0, 6)
    .map(
      (ledger) => `
      <tr>
        <td>Admission #${ledger.admission_id}</td>
        <td>Billing Ledger</td>
        <td>-</td>
        <td>${window.UI.Badge({ variant: ledger.status === 'PAID' ? 'success' : 'warning', children: ledger.status })}</td>
        <td>${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'View', onClick: `window.location.href='screen-05-billing.html'` })}</td>
      </tr>
    `,
    )
    .join('');
}

async function renderDischargeQueue() {
  const tbody = document.getElementById('pre-discharge-body');
  const badge = document.getElementById('pre-discharge-badge');
  if (!tbody || !badge) return;

  const [doctors] = await Promise.all([window.ApiClient.doctors.list()]);
  const doctorsById = {};
  doctors.forEach((d) => (doctorsById[d.doctor_id] = d));

  const joined = window.HOMHelpers.joinPreRequestsWithPatients(dashboardData.preRequests || [], dashboardData.patients || [], doctorsById);
  const pending = joined.filter((r) => r.status === 'DISCHARGE_REQUESTED');
  const approved = joined.filter((r) => r.status === 'DISCHARGE_APPROVED');

  badge.innerHTML = window.UI.Badge({ variant: pending.length ? 'warning' : 'success', children: `${pending.length} Open` });

  const rowHtml = (r, extra) => `
    <tr>
      <td>${window.HOMHelpers.escapeHtml(r.patientName)}</td>
      <td>${window.HOMHelpers.escapeHtml(r.department || '-')}</td>
      <td>${window.HOMHelpers.escapeHtml(r.doctorName)}</td>
      <td>${window.HOMHelpers.statusLabel(r.status)}</td>
      <td>${window.HOMHelpers.escapeHtml(r.hom_status || '-')}</td>
      ${extra}
    </tr>
  `;

  tbody.innerHTML =
    pending.length === 0 && approved.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding: 24px;">No discharge requests from PRE.</td></tr>`
      : pending
          .map((r) => rowHtml(r, `<td>${window.UI.Button({ variant: 'primary', size: 'sm', children: 'Approve Discharge', onClick: `approveDischarge(${r.pre_request_id})` })}</td>`))
          .join('') +
        approved
          .map((r) => rowHtml(r, `<td><span style="color: var(--text-secondary); font-size: 12px;">Approved — awaiting PRE sign-off</span></td>`))
          .join('');
}

window.approveDischarge = async function (preRequestId) {
  try {
    await window.ApiClient.preRequests.update(preRequestId, { status: 'DISCHARGE_APPROVED' });
  } catch (err) {
    showMessage(err.message || 'Unable to approve discharge.');
    return;
  }
  await renderDashboard();
};

// ============ Admission (bed request approval) modal ============

window.closeAdmissionModal = function () {
  document.getElementById('modal-admission-request')?.classList.remove('active');
  selectedBedRequestId = null;
  selectedBedId = null;
};

window.openAdmissionModal = function (bedRequestId) {
  const request = (dashboardData.bedRequests || []).find((r) => r.bed_request_id === bedRequestId);
  if (!request) return;

  const patient = (dashboardData.patients || []).find((p) => p.patient_id === request.patient_id) || {};
  const preRequest = request.pre_request_id ? (dashboardData.preRequests || []).find((r) => r.pre_request_id === request.pre_request_id) : null;
  const ward = request.ward_id ? (dashboardData.wards || []).find((w) => w.ward_id === request.ward_id) : null;

  selectedBedRequestId = bedRequestId;
  selectedBedId = null;

  document.getElementById('modal-admit-title').innerText = `Bed Request — ${patient.name || 'Patient'}`;
  document.getElementById('modal-admit-name').innerText = patient.name || '-';
  document.getElementById('modal-admit-uhid').innerText = patient.uhid || '-';
  document.getElementById('modal-admit-dept').innerHTML = window.UI.Badge({ variant: 'info', children: preRequest?.department || 'General' });
  document.getElementById('modal-admit-priority').innerHTML = window.UI.Badge({
    variant: request.priority === 'CRITICAL' ? 'error' : request.priority === 'HIGH' ? 'warning' : 'info',
    children: request.priority || 'NORMAL',
  });
  document.getElementById('modal-admit-time').innerText = window.HOMHelpers.formatDateTime(request.requested_at);
  document.getElementById('modal-admit-req').innerText = preRequest ? 'PRE' : 'HOM';
  document.getElementById('modal-admit-ward').innerHTML = ward
    ? window.UI.Badge({ variant: 'success', children: ward.ward_name })
    : '<span style="color: var(--text-secondary);">Any ward</span>';

  renderAdmitBeds(request);
  document.getElementById('modal-admission-request').classList.add('active');
};

function renderAdmitBeds(request) {
  const container = document.getElementById('modal-admit-beds');
  if (!container) return;

  const availableBeds = (dashboardData.beds || []).filter((b) => b.status === 'AVAILABLE' && (!request.ward_id || b.ward_id === request.ward_id));
  const wardsById = {};
  (dashboardData.wards || []).forEach((w) => (wardsById[w.ward_id] = w));

  container.innerHTML = availableBeds.length
    ? availableBeds
        .map(
          (bed) => `
      <button type="button" class="bed-option-btn" onclick="selectModalBed(${bed.bed_id})" id="bed-opt-${bed.bed_id}" style="padding: 16px; border-radius: 8px; border: 2px solid var(--border); background: white; text-align: left; cursor: pointer;">
        <div style="font-weight: 600; font-size: 14px;">${window.HOMHelpers.escapeHtml(bed.bed_number)}</div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${window.HOMHelpers.escapeHtml(wardsById[bed.ward_id]?.ward_name || '')}</div>
      </button>
    `,
        )
        .join('')
    : `<div style="padding: 16px; border: 1px dashed var(--border); border-radius: 8px; color: var(--text-secondary);">No available beds for this request.</div>`;
}

window.selectModalBed = function (bedId) {
  selectedBedId = bedId;
  document.querySelectorAll('.bed-option-btn').forEach((btn) => {
    btn.style.borderColor = 'var(--border)';
    btn.style.backgroundColor = 'white';
  });
  const selected = document.getElementById(`bed-opt-${bedId}`);
  if (selected) {
    selected.style.borderColor = 'var(--primary)';
    selected.style.backgroundColor = 'var(--primary-light)';
  }
};

window.approveAdmission = async function () {
  if (!selectedBedRequestId) return;
  if (!selectedBedId) {
    showMessage('Select a bed before approving.', 'warning');
    return;
  }
  try {
    await window.ApiClient.wards.bedRequests.allocate(selectedBedRequestId, selectedBedId);
  } catch (err) {
    showMessage(err.message || 'Unable to allocate bed.');
    return;
  }
  closeAdmissionModal();
  await renderDashboard();
};

window.rejectAdmissionRequest = async function () {
  if (!selectedBedRequestId) return;
  try {
    await window.ApiClient.wards.bedRequests.deny(selectedBedRequestId);
  } catch (err) {
    showMessage(err.message || 'Unable to deny this bed request.');
    return;
  }
  closeAdmissionModal();
  await renderDashboard();
};
