/**
 * dashboard.js
 * Fortified version with crash-protection for all rendering functions.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Safety Check: Ensure storage exists
  try {
    const currentData = window.Store.get();
    if (!currentData || !currentData.wards || currentData.wards.length === 0) {
        console.warn("Dashboard: Storage missing. Resetting to default data...");
        window.Store.reset(); 
    }
  } catch (e) {
    console.error("Storage Check Failed:", e);
  }

  // Render Role Badge safely
  try {
    const roleBadge = document.getElementById('role-badge');
    if (roleBadge) {
        const currentProfile = window.RoleAccess?.getProfile?.();
        const badgeLabel = currentProfile?.accessRole === 'SUPER_USER'
          ? 'Super User · Full CRUD Access'
          : 'Hospital Operations Manager';
        roleBadge.innerHTML = window.UI.Badge({ variant: 'info', children: badgeLabel });
    }
  } catch (e) {}

  // Render everything
  renderDashboard();
  initializeDashboardControls();

  // Listen for real-time updates from other interactions
  window.addEventListener('storeUpdated', renderDashboard);
});

let currentSelectedAdmissionId = null;
let currentSelectedBed = null;
let currentWardFilter = 'ALL';
let currentStatusFilter = 'ALL';

function setDashboardFormMessage(id, message) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message || '';
  element.style.display = message ? 'block' : 'none';
}

function clearDashboardFormMessage(id) {
  setDashboardFormMessage(id, '');
}

function showDashboardMessage(message) {
  alert(message);
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

  document.querySelector('[data-flow="open-discharge-queue-modal"]')?.addEventListener('click', () => {
    document.getElementById('pre-discharge-body')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.querySelector('[data-flow="open-generate-report-modal"]')?.addEventListener('click', () => {
    showDashboardMessage('Operations report shortcut opened. Use Billing Summary for full export-ready reports.');
    window.location.href = 'screen-05-billing.html';
  });

  document.querySelector('[data-flow="open-alerts-panel"]')?.addEventListener('click', () => {
    document.getElementById('activity-log-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.querySelector('[data-flow="ward-filter"]')?.addEventListener('click', () => {
    const states = ['ALL', 'ICU Ward', 'General Ward'];
    currentWardFilter = states[(states.indexOf(currentWardFilter) + 1) % states.length];
    renderDashboard();
  });

  document.querySelector('[data-flow="status-filter"]')?.addEventListener('click', () => {
    const states = ['ALL', 'available', 'occupied', 'reserved'];
    currentStatusFilter = states[(states.indexOf(currentStatusFilter) + 1) % states.length];
    renderDashboard();
  });

  document.getElementById('btn-dashboard-date')?.addEventListener('click', () => {
    showDashboardMessage('Dashboard is showing live operational data for today.');
  });

  document.getElementById('dashboard-patient-search')?.addEventListener('input', () => {
    clearDashboardFormMessage('dashboard-bed-form-error');
    filterDashboardBedSearch();
  });
}

function renderDashboard() {
  const data = window.Store.get() || {};
  
  // Wrap every single render function in a try-catch safety net.
  // If one fails, the others will still draw perfectly.
  try { renderMetrics(data); } catch (e) { console.error("Failed to render Metrics:", e); }
  try { renderBedRegistry(data); } catch (e) { console.error("Failed to render Bed Registry:", e); }
  try { renderAdmissionsTable(data); } catch (e) { console.error("Failed to render Admissions:", e); }
  try { renderServiceRequests(data); } catch (e) { console.error("Failed to render Service Requests:", e); }
  try { renderWardOccupancy(data); } catch (e) { console.error("Failed to render Occupancy:", e); }
  try { renderActivityLog(data); } catch (e) { console.error("Failed to render Activity Log:", e); }
  try { renderDispatchQueue(data); } catch (e) { console.error("Failed to render Dispatch Queue:", e); }
  try { renderPreDischargeQueue(); } catch (e) { console.error("Failed to render PRE Discharge Queue:", e); }
}

function renderMetrics(data) {
  const wards = data.wards || [];
  const patients = data.patients || [];
  const pending = data.pendingAdmissions || [];

  const totalBeds = wards.reduce((acc, ward) => acc + (ward.total || 0), 0);
  const activePatients = patients.filter(p => ['Admitted', 'Critical', 'Pending Discharge'].includes(p.status)).length;
  
  const totalOccupied = wards.reduce((acc, ward) => acc + (ward.occupied || 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;
  
  const pendingCount = pending.length;
  const availableBeds = wards.reduce((acc, ward) => acc + (ward.available || 0), 0);
  const reservedBeds = wards.reduce((acc, ward) => acc + (ward.reserved || 0), 0);

  const icons = {
    bed: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#20B2AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    users: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    chart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-4"/></svg>`,
    alert: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
  };

  const container = document.getElementById('metrics-container');
  if(container) {
    container.innerHTML = `
      <div class="card" style="padding: 24px;">
        <div class="metric-card-icon" style="background: #E0F7F6;">${icons.bed}</div>
        <div class="metric-value" style="color: var(--text-primary);">${totalBeds}</div>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Total Beds Managed</div>
        ${window.UI.Badge({ variant: 'neutral', children: `${availableBeds} Available · ${reservedBeds} Reserved` })}
      </div>
      <div class="card" style="padding: 24px;">
        <div class="metric-card-icon" style="background: #FEF3C7;">${icons.users}</div>
        <div class="metric-value" style="color: var(--text-primary);">${activePatients}</div>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Active Inpatients</div>
        ${window.UI.Badge({ variant: 'success', children: '↑ +8 from yesterday' })}
      </div>
      <div class="card" style="padding: 24px;">
        <div class="metric-card-icon" style="background: #FEF3C7;">${icons.chart}</div>
        <div class="metric-value" style="color: #F59E0B;">${occupancyRate}%</div>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Bed Occupancy Rate</div>
        ${window.UI.Badge({ variant: 'warning', children: '↑ nearing capacity' })}
      </div>
      <div class="card" style="padding: 24px;">
        <div class="metric-card-icon" style="background: #FEE2E2;">${icons.alert}</div>
        <div class="metric-value" style="color: #EF4444;">${pendingCount}</div>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Pending Bed Requests</div>
        ${window.UI.Badge({ variant: pendingCount > 0 ? 'error' : 'success', children: pendingCount > 0 ? 'Requires action' : 'All clear' })}
      </div>
    `;
  }
}

function getBedStyle(status) {
  switch(status) {
    case 'available': return { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', label: 'Available' };
    case 'occupied': return { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Occupied' };
    case 'reserved': return { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', label: 'Reserved' };
    case 'maintenance': return { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569', label: 'Maintenance' };
    default: return { bg: '#ffffff', border: '#E2E8F0', text: '#1E293B', label: 'Unknown' };
  }
}

function renderBedRegistry(data) {
  const container = document.getElementById('bed-registry-container');
  if(!container || !data.wards) return;
  let html = '';

  const wardNames = currentWardFilter === 'ALL' ? ['ICU Ward', 'General Ward'] : [currentWardFilter];

  wardNames.forEach(wardName => {
    const ward = data.wards.find(w => w.name === wardName);
    if (!ward || !ward.beds) return;
    
    const filteredBeds = ward.beds.filter((bed) => currentStatusFilter === 'ALL' || bed.status === currentStatusFilter);
    const previewBeds = filteredBeds.slice(0, wardName === 'ICU Ward' ? 6 : 8);
    if (previewBeds.length === 0) return;

    html += `<h3 style="font-size: 14px; font-weight: 500; margin: 0 0 12px 0;">${wardName === 'ICU Ward' ? 'ICU' : wardName}</h3>`;
    html += `<div class="bed-grid">`;
    previewBeds.forEach(bed => {
      const style = getBedStyle(bed.status);
      const subtitle = bed.patient ? bed.patient : style.label;
      const dataFlow = bed.status === 'available' ? 'data-flow="open-assign-bed-modal"' : '';
      
      html += `
        <button class="bed-card" style="background-color: ${style.bg}; border-color: ${style.border}; color: ${style.text};" ${dataFlow}>
          <div class="bed-card-title">${bed.number}</div>
          <div class="bed-card-subtitle">${subtitle}</div>
        </button>
      `;
    });
    html += `</div>`;
  });

  container.innerHTML = html;
  
  // Re-attach modal listeners after rendering
  document.querySelectorAll('[data-flow="open-assign-bed-modal"]').forEach(btn => {
    btn.addEventListener('click', openGeneralAssignModal);
  });

  document.querySelector('[data-flow="ward-filter"]').textContent = `Ward: ${currentWardFilter === 'ALL' ? 'All' : currentWardFilter.replace(' Ward', '')}`;
  document.querySelector('[data-flow="status-filter"]').textContent = `Status: ${currentStatusFilter === 'ALL' ? 'All' : currentStatusFilter}`;
}

function renderAdmissionsTable(data) {
  const tbody = document.getElementById('admissions-table-body');
  const badgeHeader = document.getElementById('pending-badge-header');
  const pending = data.pendingAdmissions || [];
  
  if(badgeHeader) {
      badgeHeader.innerHTML = window.UI.Badge({ variant: 'warning', children: `${pending.length} Pending` });
  }

  if(!tbody) return;

  if(pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px;">No pending admissions</td></tr>`;
    return;
  }

  let html = '';
  pending.forEach(adm => {
    const priorityVariant = (adm.priority === "Critical" || adm.priority === "Urgent") ? "error" : 
                            (adm.priority === "High") ? "warning" : "info";
    
    html += `
      <tr onclick="openAdmissionModal(${adm.id})" style="cursor: pointer;">
        <td style="font-weight: 500;">${adm.patient}</td>
        <td>${adm.uhid}</td>
        <td>${adm.dept}</td>
        <td>${adm.requestedBy}</td>
        <td>${window.UI.Badge({ variant: priorityVariant, children: adm.priority })}</td>
        <td>${adm.time}</td>
        <td>${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'Assign Bed' })}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function renderWardOccupancy(data) {
  const container = document.getElementById('occupancy-container');
  if(!container || !data.wards) return;
  let html = '';

  data.wards.forEach(ward => {
    const percentage = ward.total > 0 ? Math.round(((ward.occupied || 0) / ward.total) * 100) : 0;
    let color = '#10B981'; 
    if (percentage >= 90) color = '#EF4444'; 
    else if (percentage >= 75) color = '#F59E0B'; 

    html += `
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px;">
          <span style="font-weight: 500; color: var(--text-primary);">${ward.name}</span>
          <span style="color: var(--text-secondary);">${ward.occupied || 0}/${ward.total} beds (${percentage}%)</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function renderActivityLog(data) {
  const container = document.getElementById('activity-log-container');
  if(!container || !data.activityLog) return;
  let html = '';

  const colors = { success: '#10B981', info: '#3B82F6', warning: '#F59E0B', error: '#EF4444' };

  data.activityLog.slice(0,5).forEach(log => {
    html += `
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <div style="width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background-color: ${colors[log.type] || colors.info}"></div>
        <div>
          <p style="font-size: 14px; margin: 0; color: var(--text-primary);">${log.text}</p>
          <p style="font-size: 12px; margin: 2px 0 0 0; color: var(--text-muted);">${log.time}</p>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderServiceRequests(data) {
  const patientSelect = document.getElementById('hom-patient-select');
  const serviceSelect = document.getElementById('hom-service-select');
  const tbody = document.getElementById('service-requests-body');
  const badge = document.getElementById('service-request-badge');
  if (!patientSelect || !serviceSelect || !tbody || !badge) return;

  const admissions = Object.values(data.admissions || {});
  const serviceRequests = data.serviceRequests || [];
  const pendingCount = serviceRequests.filter((item) => item.status === 'PENDING').length;

  badge.innerHTML = window.UI.Badge({ variant: pendingCount > 0 ? 'warning' : 'success', children: `${pendingCount} Pending` });

  patientSelect.innerHTML = admissions.map((admission) =>
    `<option value="${admission.admission_id}">${admission.patient_name} (${admission.uhid})</option>`
  ).join('');

  serviceSelect.innerHTML = window.Store.getServiceCatalog().map((service) =>
    `<option value="${service}">${service}</option>`
  ).join('');

  if (serviceRequests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">No HOM service orders yet.</td></tr>';
    return;
  }

  tbody.innerHTML = serviceRequests.slice(0, 6).map((request) => `
    <tr>
      <td>${request.patient_name}</td>
      <td>${request.uhid}</td>
      <td>${request.service}</td>
      <td>${request.service_count || 1}</td>
      <td>${window.UI.Badge({ variant: request.status === 'PENDING' ? 'warning' : 'success', children: request.status })}</td>
      <td>${new Date(request.created_at || Date.now()).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
    </tr>
  `).join('');
}

function renderDispatchQueue(data) {
  const tbody = document.getElementById('dispatch-queue-body');
  const badge = document.getElementById('dispatch-queue-badge');
  if (!tbody || !badge) return;

  const queue = (data.dispatchQueue || []).slice().sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  const readyCount = queue.filter((item) => item.status === 'QUEUED').length;
  badge.innerHTML = window.UI.Badge({ variant: readyCount > 0 ? 'warning' : 'neutral', children: `${readyCount} Awaiting HOM` });

  if (queue.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px;">Nothing has been queued by Finance yet.</td></tr>';
    return;
  }

  tbody.innerHTML = queue.slice(0, 6).map((item) => `
    <tr>
      <td>${item.patient_name}</td>
      <td>
        <div style="font-weight: 600;">${getDispatchLabel(item)}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${getDispatchReference(item) || 'Reference available after send'}</div>
      </td>
      <td>${item.amount ? `Rs ${Number(item.amount).toLocaleString('en-IN')}` : '-'}</td>
      <td>${window.UI.Badge({ variant: item.status === 'SENT' ? 'success' : 'warning', children: item.status })}</td>
      <td>
        <div style="display:flex; gap:8px; align-items:center;">
          ${item.status === 'QUEUED'
            ? window.UI.Button({ variant: 'primary', size: 'sm', children: 'Send to Patient', onClick: `sendDispatchItem(${item.id})` })
            : '<span style="color: var(--text-secondary); font-size: 12px;">Delivered</span>'}
          ${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'Copy Link', onClick: `copyDispatchReference(${item.id})` })}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPreDischargeQueue() {
  const tbody = document.getElementById('pre-discharge-body');
  const badge = document.getElementById('pre-discharge-badge');
  if (!tbody || !badge) return;

  const rows = window.Store.getPreDischargeRows();
  const openCount = rows.filter(row => row.patientStatus === 'Discharge Pending').length;
  badge.innerHTML = window.UI.Badge({ variant: openCount ? 'warning' : 'success', children: `${openCount} Open` });

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">No discharge requests from PRE.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.name} <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">${row.patientId}</div></td>
      <td>${row.department || '-'}</td>
      <td>${row.doctor || '-'}</td>
      <td>${window.UI.Badge({ variant: row.patientStatus === 'Approved Discharge' ? 'success' : 'warning', children: row.patientStatus })}</td>
      <td>${window.UI.Badge({ variant: row.homStatus === 'Confirmed by HOM' ? 'success' : 'info', children: row.homStatus })}</td>
      <td>
        <div style="display:flex; gap:8px; align-items:center;">
          ${row.canSendToFA ? window.UI.Button({ variant: 'secondary', size: 'sm', children: 'Send to FA', onClick: `sendPreDischargeToFA('${row.patientId}')` }) : ''}
          ${row.canConfirmToPRE ? window.UI.Button({ variant: 'primary', size: 'sm', children: 'Confirm to PRE', onClick: `confirmPreDischarge('${row.patientId}')` }) : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function getDispatchLabel(item) {
  if (item.type === 'EOD_BILL') return 'Billing Link';
  if (item.type === 'PAYMENT_LINK') return `Payment Link (${item.payment_mode || 'N/A'})`;
  if (item.type === 'FINAL_RECEIPT') return 'Final Receipt';
  return 'Discharge Summary';
}

function getDispatchReference(item) {
  return item.discharge_summary_link || item.receipt_link || item.payment_link || item.billing_link || item.link || '';
}

// ==========================================
// ADMISSION REQUEST MODAL
// ==========================================
window.openAdmissionModal = function(admissionId) {
  const data = window.Store.get();
  const admission = data.pendingAdmissions.find(a => a.id === admissionId);
  if (!admission) return;

  currentSelectedAdmissionId = admission.id;
  currentSelectedBed = null;

  document.getElementById('modal-admit-title').innerText = `Admission Request — ${admission.patient}`;
  document.getElementById('modal-admit-name').innerText = admission.patient;
  document.getElementById('modal-admit-uhid').innerText = admission.uhid;
  
  const priorityVariant = (admission.priority === "Critical" || admission.priority === "Urgent") ? "error" : "warning";
  document.getElementById('modal-admit-dept').innerHTML = window.UI.Badge({ variant: 'info', children: admission.dept });
  document.getElementById('modal-admit-priority').innerHTML = window.UI.Badge({ variant: priorityVariant, children: admission.priority });
  document.getElementById('modal-admit-time').innerText = admission.time;
  document.getElementById('modal-admit-req').innerText = admission.requestedBy;
  document.getElementById('modal-admit-ward').innerHTML = admission.preferredWard
    ? window.UI.Badge({ variant: 'success', children: admission.preferredWard })
    : '<span style="color: var(--text-secondary);">Not specified</span>';

  const bedsContainer = document.getElementById('modal-admit-beds');
  if(bedsContainer) {
      let availableBedsList = [];
      data.wards.forEach(w => w.beds.filter(b => b.status === 'available').slice(0,2).forEach(b => availableBedsList.push({ number: b.number, ward: w.name, rate: 3500 })));
      
      bedsContainer.innerHTML = availableBedsList.slice(0, 2).map(bed => `
        <button class="bed-option-btn" onclick="selectModalBed('${bed.number}')" id="bed-opt-${bed.number}" style="padding: 16px; border-radius: 8px; border: 2px solid var(--border); background: white; text-align: left; cursor: pointer;">
          <div style="font-weight: 600; font-size: 14px;">${bed.number}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${bed.ward}</div>
        </button>
      `).join('');
  }

  const modal = document.getElementById('modal-admission-request');
  if(modal) modal.classList.add('active');
}

window.closeAdmissionModal = function() {
  const modal = document.getElementById('modal-admission-request');
  if(modal) modal.classList.remove('active');
  currentSelectedAdmissionId = null;
  currentSelectedBed = null;
}

// ==========================================
// GENERAL DASHBOARD ASSIGN MODAL
// ==========================================
window.openGeneralAssignModal = function() {
  const data = window.Store.get();
  let availableBeds = [];
  
  data.wards.forEach(w => {
    w.beds.filter(b => b.status === 'available').slice(0, 2).forEach(b => {
      availableBeds.push({ number: b.number, ward: w.name });
    });
  });

  const dashBedsContainer = document.getElementById('dashboard-available-beds');
  if (dashBedsContainer) {
      dashBedsContainer.innerHTML = availableBeds.map(bed => `
        <button class="bed-option-btn" onclick="selectModalBed('${bed.number}')" id="bed-opt-${bed.number}" style="padding: 16px; border-radius: 8px; border: 2px solid var(--border); background: white; text-align: left; cursor: pointer;">
          <div style="font-weight: 600; font-size: 14px;">${bed.number}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${bed.ward}</div>
        </button>
      `).join('');
  }

  const modal = document.getElementById('modal-assign-bed');
  if (modal) modal.classList.add('active');
  clearDashboardFormMessage('dashboard-bed-form-error');
  const hint = document.getElementById('dashboard-bed-hint');
  if (hint) hint.textContent = 'Filter visible beds while entering the patient to assign.';
}

window.closeGeneralAssignModal = function() {
  const modal = document.getElementById('modal-assign-bed');
  if (modal) modal.classList.remove('active');
  currentSelectedBed = null;
  const searchInput = document.getElementById('dashboard-patient-search');
  if (searchInput) searchInput.value = '';
  clearDashboardFormMessage('dashboard-bed-form-error');
  const hint = document.getElementById('dashboard-bed-hint');
  if (hint) hint.textContent = '';
  filterDashboardBedSearch();
}

// Shared Bed Selection Logic
window.selectModalBed = function(bedNumber) {
  currentSelectedBed = bedNumber;
  document.querySelectorAll('.bed-option-btn').forEach(btn => {
    btn.style.borderColor = 'var(--border)';
    btn.style.backgroundColor = 'white';
  });
  const selected = document.getElementById(`bed-opt-${bedNumber}`);
  if(selected) {
      selected.style.borderColor = 'var(--primary)';
      selected.style.backgroundColor = 'var(--primary-light)';
  }
};

window.approveAdmission = function() {
  if (!currentSelectedBed) return alert("Please select a bed.");
  window.Store.assignBed(currentSelectedAdmissionId, currentSelectedBed);
  closeAdmissionModal();
}

window.confirmDashboardBedAllocation = function() {
  const searchValue = document.getElementById('dashboard-patient-search')?.value.trim() || '';
  if (!searchValue) {
    setDashboardFormMessage('dashboard-bed-form-error', 'Enter a patient UHID or name before confirming admission.');
    return;
  }
  if (searchValue.length < 3) {
    setDashboardFormMessage('dashboard-bed-form-error', 'Patient search must be at least 3 characters long.');
    return;
  }
  if (!currentSelectedBed) {
    setDashboardFormMessage('dashboard-bed-form-error', 'Select a bed before confirming admission.');
    return;
  }

  clearDashboardFormMessage('dashboard-bed-form-error');
  const label = searchValue;
  window.Store.updateBedStatus(currentSelectedBed, 'occupied', label);
  window.Store.logActivity('success', `Direct allocation: Bed ${currentSelectedBed} assigned to ${label}`);
  closeGeneralAssignModal();
}

window.submitServiceRequest = function() {
  const patientId = Number(document.getElementById('hom-patient-select')?.value);
  const service = document.getElementById('hom-service-select')?.value;
  const qty = Number(document.getElementById('hom-service-qty')?.value || 1);

  if (!patientId) {
    setDashboardFormMessage('hom-service-form-error', 'Select a patient before creating a service request.');
    return;
  }
  if (!service) {
    setDashboardFormMessage('hom-service-form-error', 'Select a service before creating a request.');
    return;
  }
  if (!Number.isInteger(qty) || qty < 1) {
    setDashboardFormMessage('hom-service-form-error', 'Service quantity must be a whole number greater than 0.');
    return;
  }

  clearDashboardFormMessage('hom-service-form-error');
  window.Store.createServiceRequest(patientId, service, qty);
  document.getElementById('hom-service-qty').value = '1';
};

window.sendDispatchItem = function(dispatchId) {
  const success = window.Store.dispatchToPatient(dispatchId);
  if (!success) alert('Dispatch item not found.');
};

window.copyDispatchReference = function(dispatchId) {
  const data = window.Store.get();
  const item = (data.dispatchQueue || []).find(entry => entry.id === dispatchId);
  if (!item) {
    alert('Dispatch item not found.');
    return;
  }

  const reference = getDispatchReference(item);
  if (!reference) {
    alert('No dispatch reference available yet.');
    return;
  }

  navigator.clipboard.writeText(reference).then(() => {
    alert('Dispatch reference copied.');
  }).catch(() => {
    alert(reference);
  });
};

window.sendPreDischargeToFA = function(uhid) {
  const success = window.Store.requestDischargeBilling(uhid);
  if (!success) {
    alert('Unable to send discharge request to FA.');
    return;
  }
  alert(`Discharge request forwarded to FA for ${uhid}.`);
};

window.confirmPreDischarge = function(uhid) {
  const success = window.Store.confirmDischargeBackToPRE(uhid);
  if (!success) {
    alert('HOM needs discharge summary, payment link, and receipt from FA before confirming to PRE.');
    return;
  }
  alert(`Discharge completion confirmed back to PRE for ${uhid}.`);
};

window.rejectAdmissionRequest = function() {
  const data = window.Store.get();
  if (!currentSelectedAdmissionId) {
    alert('No admission request selected.');
    return;
  }

  const index = (data.pendingAdmissions || []).findIndex((item) => item.id === currentSelectedAdmissionId);
  if (index === -1) {
    alert('Admission request not found.');
    return;
  }

  const [removed] = data.pendingAdmissions.splice(index, 1);
  window.Store.save(data);
  window.Store.logActivity('error', `Admission request rejected for ${removed.patient} (${removed.uhid})`);
  closeAdmissionModal();
};

function filterDashboardBedSearch() {
  const query = (document.getElementById('dashboard-patient-search')?.value || '').trim().toLowerCase();
  const options = document.querySelectorAll('#dashboard-available-beds .bed-option-btn');
  const hint = document.getElementById('dashboard-bed-hint');
  if (hint) {
    if (!query) hint.textContent = 'Filter visible beds while entering the patient to assign.';
    else if (query.length < 3) hint.textContent = 'Enter at least 3 characters for patient lookup.';
    else hint.textContent = `Filtering visible beds for: ${query}`;
  }

  options.forEach((option) => {
    const text = option.textContent.toLowerCase();
    option.style.display = !query || text.includes(query) ? '' : 'none';
  });
}
