'use strict';

/**
 * dashboard.js — HOM Dashboard.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const roleBadge = document.getElementById('role-badge');
  if (roleBadge) {
    const profile = window.RoleAccess?.getProfile?.();
    const label = profile?.accessRole === 'SUPER_USER' ? 'Super User · Full CRUD Access' : 'Hospital Operations Manager';
    roleBadge.innerHTML = window.UI.Badge({ variant: 'info', children: label });
  }

  const dateSubtitle = document.getElementById('dashboard-date-subtitle');
  if (dateSubtitle) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    dateSubtitle.textContent = `${today} · Live operational overview`;
  }

  initializeDashboardControls();
  await renderDashboard();

  // Live polling: auto-refresh metrics, queues, and activity log every 15s
  setInterval(() => {
    if (!document.hidden) renderDashboard();
  }, 15000);

  // Instant refresh when user switches focus to this tab
  window.addEventListener('focus', () => {
    renderDashboard();
  });
});

let currentWardFilter = 'ALL';
let currentStatusFilter = 'ALL';
let selectedBedRequestId = null;
let selectedBedId = null;

function initializeDashboardControls() {
  // Navigation & action buttons initialized
}

let dashboardData = {};

async function loadDashboardData() {
  const [preRequests, patients, wards, beds, bedRequests, activity] = await Promise.all([
    window.ApiClient.preRequests.list().catch(() => []),
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.wards.list().catch(() => []),
    window.ApiClient.wards.beds().catch(() => []),
    window.ApiClient.wards.bedRequests.list().catch(() => []),
    window.ApiClient.activityLog.list().catch(() => []),
  ]);
  return {
    preRequests: Array.isArray(preRequests) ? preRequests : [],
    patients: Array.isArray(patients) ? patients : [],
    wards: Array.isArray(wards) ? wards : [],
    beds: Array.isArray(beds) ? beds : [],
    bedRequests: Array.isArray(bedRequests) ? bedRequests : [],
    activity: Array.isArray(activity) ? activity : [],
  };
}

async function renderDashboard() {
  dashboardData = await loadDashboardData();

  try {
    renderMetrics(dashboardData);
  } catch (e) {
    console.error('Failed to render metrics:', e);
  }
  try {
    renderAdmissionsTable(dashboardData);
  } catch (e) {
    console.error('Failed to render admissions:', e);
  }
  try {
    renderActivityLog(dashboardData);
  } catch (e) {
    console.error('Failed to render activity log:', e);
  }
  try {
    await renderDischargeQueue();
  } catch (e) {
    console.error('Failed to render discharge queue:', e);
  }
}

function renderMetrics(data) {
  const totalBeds = (data.wards || []).reduce((sum, w) => sum + (w.total_beds || 0), 0);
  const occupied = (data.wards || []).reduce((sum, w) => sum + (w.occupied_beds || 0), 0);
  const available = Math.max(0, totalBeds - occupied);
  const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

  const activeStatuses = ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'];
  const activeInpatients = (data.preRequests || []).filter((r) => activeStatuses.includes(r.status)).length;
  const pendingCount = (data.bedRequests || []).filter((r) => r.status === 'PENDING').length;

  document.getElementById('metrics-container').innerHTML = `
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Total Beds Managed</div>
        <div class="kpi-value">${totalBeds}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: 'neutral', children: `${available} Available · ${occupied} Occupied` })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Active Inpatients</div>
        <div class="kpi-value">${activeInpatients}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: 'success', children: 'Admitted & Flow' })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Bed Occupancy Rate</div>
        <div class="kpi-value" style="color: ${occupancyRate >= 90 ? 'var(--status-error-fg, #b3261e)' : occupancyRate >= 75 ? 'var(--status-warning-fg, #7a5300)' : 'var(--text-primary)'};">${occupancyRate}%</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: occupancyRate >= 90 ? 'error' : occupancyRate >= 75 ? 'warning' : 'success', children: occupancyRate >= 75 ? 'Nearing capacity' : 'Healthy' })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Pending Bed Requests</div>
        <div class="kpi-value" style="color: ${pendingCount > 0 ? 'var(--status-error-fg, #b3261e)' : 'var(--text-primary)'};">${pendingCount}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: pendingCount > 0 ? 'error' : 'success', children: pendingCount > 0 ? 'Requires action' : 'All clear' })}
      </div>
    </div>
  `;
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

function timeAgo(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function parseOperationalLog(log) {
  const text = log.text || '';
  const meta = log.meta || {};
  let category = 'OPERATION';
  let badgeVariant = 'neutral';
  let title = text;
  let subtitle = 'Hospital operational event';
  const actor = meta.actorRole ? `By ${meta.actorRole}` : 'System';

  if (/allocated/i.test(text)) {
    category = 'BED ALLOCATED';
    badgeVariant = 'success';
    title = text;
    subtitle = 'Physical bed assigned and patient admitted to ward';
  } else if (/Bed requested/i.test(text)) {
    category = 'BED REQUESTED';
    badgeVariant = 'info';
    title = text;
    subtitle = 'Bed allocation queued for incoming patient';
  } else if (/Pre-registration submitted/i.test(text)) {
    category = 'ADMISSION QUEUED';
    badgeVariant = 'info';
    title = text;
    subtitle = 'New patient pre-registration submitted';
  } else if (/DISCHARGE_REQUESTED/i.test(text)) {
    category = 'DISCHARGE CLEARANCE';
    badgeVariant = 'warning';
    title = `Discharge clearance requested for Pre-request #${meta.preRequestId || ''}`;
    subtitle = 'Awaiting HOM operational discharge sign-off';
  } else if (/DISCHARGE_APPROVED/i.test(text)) {
    category = 'DISCHARGE APPROVED';
    badgeVariant = 'success';
    title = `Discharge approved by HOM for Pre-request #${meta.preRequestId || ''}`;
    subtitle = 'Patient cleared for release and bed turnover';
  } else if (/ADMITTED/i.test(text)) {
    category = 'PATIENT ADMITTED';
    badgeVariant = 'success';
    title = `Inpatient admission confirmed for Pre-request #${meta.preRequestId || ''}`;
    subtitle = 'Patient active under hospital ward care';
  } else if (/Emergency/i.test(text)) {
    category = 'EMERGENCY ADMISSION';
    badgeVariant = 'error';
    title = text;
    subtitle = 'High-priority emergency walk-in registered';
  } else if (/denied/i.test(text)) {
    category = 'REQUEST DENIED';
    badgeVariant = 'error';
    title = text;
    subtitle = 'Bed request denied by HOM';
  } else if (/Ledger|Charge|Billing/i.test(text)) {
    category = 'BILLING EVENT';
    badgeVariant = 'neutral';
    title = text;
    subtitle = 'Patient billing ledger updated';
  }

  return { category, badgeVariant, title, subtitle, actor };
}

function renderActivityLog(data) {
  const container = document.getElementById('activity-log-container');
  if (!container) return;

  const sortedLogs = [...(data.activity || [])].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || b.log_id || 0) - (a.id || a.log_id || 0);
  });

  if (!sortedLogs.length) {
    container.innerHTML = `<p style="margin:0; color: var(--text-secondary); font-size: 14px; text-align: center; padding: 24px 0;">No activity recorded yet.</p>`;
    return;
  }

  container.innerHTML = sortedLogs.slice(0, 12).map((log) => {
    const parsed = parseOperationalLog(log);
    const ago = timeAgo(log.created_at);
    const fullTime = window.HOMHelpers.formatDateTime(log.created_at);

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--md-surface-container, #ffffff); border: 1px solid var(--border); border-radius: var(--radius-md, 12px); gap: 16px; transition: background-color 0.2s;">
        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
          <span class="badge badge-${parsed.badgeVariant}" style="font-size: 11px; flex-shrink: 0;">${parsed.category}</span>
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.HOMHelpers.escapeHtml(parsed.title)}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${window.HOMHelpers.escapeHtml(parsed.subtitle)}</div>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);" title="${fullTime}">${ago}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${parsed.actor}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function renderDischargeQueue() {
  const tbody = document.getElementById('pre-discharge-body');
  const badge = document.getElementById('pre-discharge-badge');
  if (!tbody || !badge) return;

  const doctors = await window.ApiClient.doctors.list().catch(() => []);
  const doctorsById = {};
  (Array.isArray(doctors) ? doctors : []).forEach((d) => (doctorsById[d.doctor_id] = d));

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
  if (typeof window.openModal === 'function') {
    window.openModal('modal-admission-request');
  } else {
    document.getElementById('modal-admission-request')?.classList.add('active');
    document.body.classList.add('modal-open');
  }
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
