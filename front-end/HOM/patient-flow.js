'use strict';

/**
 * patient-flow.js — HOM Patient Flow & Admissions.
 */

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  await loadAndRender();

  // Auto-refresh patient flow data every 15 seconds
  setInterval(() => {
    if (!document.hidden) loadAndRender();
  }, 15000);

  // Instant refresh on tab focus
  window.addEventListener('focus', () => {
    loadAndRender();
  });
});

let flowData = {};
let currentSelectedRequest = null;
let flowFilters = { search: '', department: '', status: '', dateRange: '' };

function bindControls() {
  const searchInput = document.getElementById('patient-flow-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      flowFilters.search = event.target.value.trim().toLowerCase();
      renderPatientsTable();
    });
  }

  ['patient-flow-department', 'patient-flow-status', 'patient-flow-date-range'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      flowFilters.department = document.getElementById('patient-flow-department').value;
      flowFilters.status = document.getElementById('patient-flow-status').value;
      flowFilters.dateRange = document.getElementById('patient-flow-date-range').value;
      renderPatientsTable();
    });
  });

  document.getElementById('patient-flow-clear')?.addEventListener('click', () => {
    flowFilters = { search: '', department: '', status: '', dateRange: '' };
    const searchEl = document.getElementById('patient-flow-search');
    if (searchEl) searchEl.value = '';
    const deptEl = document.getElementById('patient-flow-department');
    if (deptEl) deptEl.value = '';
    const statusEl = document.getElementById('patient-flow-status');
    if (statusEl) statusEl.value = '';
    const dateEl = document.getElementById('patient-flow-date-range');
    if (dateEl) dateEl.value = '';
    renderPatientsTable();
  });

  document.getElementById('patient-flow-export')?.addEventListener('click', exportPatientFlow);
}

function setDischargeError(message) {
  const el = document.getElementById('discharge-form-error');
  if (!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
}

const FLOW_STATUSES = ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED', 'DISCHARGED'];

async function loadAndRender() {
  const [preRequests, patients, doctors, beds, admissions, ledgers] = await Promise.all([
    window.ApiClient.preRequests.list().catch(() => []),
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.doctors.list().catch(() => []),
    window.ApiClient.wards.beds().catch(() => []),
    window.ApiClient.admissions.list().catch(() => []),
    window.ApiClient.billing.ledger.listAll().catch(() => []),
  ]);
  const doctorsById = {};
  (Array.isArray(doctors) ? doctors : []).forEach((d) => (doctorsById[d.doctor_id] = d));
  const bedsById = {};
  (Array.isArray(beds) ? beds : []).forEach((b) => (bedsById[b.bed_id] = b));

  // "Bills cleared" signal from Finance: the patient's active admission has
  // a PAID ledger. HOM watches this so it knows the patient is financially
  // clear and PRE can safely release the bed.
  const ledgerByAdmission = {};
  (Array.isArray(ledgers) ? ledgers : []).forEach((l) => (ledgerByAdmission[l.admission_id] = l));
  const billsClearedByPatient = {};
  (Array.isArray(admissions) ? admissions : []).forEach((a) => {
    const ledger = ledgerByAdmission[a.admission_id];
    if (a.bills_cleared || (ledger && ledger.status === 'PAID')) {
      billsClearedByPatient[a.patient_id] = true;
    }
  });

  const validPreRequests = Array.isArray(preRequests) ? preRequests : [];
  const validPatients = Array.isArray(patients) ? patients : [];

  const joined = window.HOMHelpers.joinPreRequestsWithPatients(
    validPreRequests.filter((r) => FLOW_STATUSES.includes(r.status)),
    validPatients,
    doctorsById,
  ).map((r) => ({
    ...r,
    bedNumber: bedsById[r.bed_id]?.bed_number || '-',
    billsCleared: Boolean(billsClearedByPatient[r.patient_id]),
  }));

  flowData = { rows: joined, bedsById };
  renderDischargeQueue();
  populateDepartmentFilter();
  renderPatientsTable();
}

function renderDischargeQueue() {
  const tbody = document.getElementById('discharge-queue-tbody');
  const badge = document.getElementById('discharge-queue-badge');
  if (!tbody || !badge) return;

  const pending = (flowData.rows || []).filter((r) => r.status === 'DISCHARGE_REQUESTED');
  const approved = (flowData.rows || []).filter((r) => r.status === 'DISCHARGE_APPROVED');

  badge.innerHTML = window.UI.Badge({
    variant: pending.length ? 'warning' : 'success',
    children: pending.length ? `${pending.length} Clearance Pending` : 'All Cleared',
  });

  if (!pending.length && !approved.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-secondary);">No pending discharge clearance requests from PRE. All active inpatients are under ongoing ward care.</td></tr>`;
    return;
  }

  tbody.innerHTML =
    pending
      .map((row) => `
        <tr>
          <td style="font-weight: 500; color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.patientUhid)}</td>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(row.patientName)}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${row.patientAge}</div>
          </td>
          <td>${window.HOMHelpers.escapeHtml(row.department || 'General')}</td>
          <td style="font-weight: 500;">${window.HOMHelpers.escapeHtml(row.bedNumber)}</td>
          <td>${window.HOMHelpers.escapeHtml(row.doctorName)}</td>
          <td>${window.HOMHelpers.formatDate(row.decided_at || row.created_at)}</td>
          <td>${window.HOMHelpers.daysSince(row.decided_at || row.created_at)} days</td>
          <td>${window.UI.Button({ variant: 'primary', size: 'sm', children: 'Approve Clearance', onClick: `openDischargeModal(${row.pre_request_id})` })}</td>
        </tr>
      `)
      .join('') +
    approved
      .map((row) => `
        <tr>
          <td style="font-weight: 500; color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.patientUhid)}</td>
          <td>
            <div style="font-weight: 500; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(row.patientName)}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${row.patientAge}</div>
          </td>
          <td>${window.HOMHelpers.escapeHtml(row.department || 'General')}</td>
          <td>${window.HOMHelpers.escapeHtml(row.bedNumber)}</td>
          <td>${window.HOMHelpers.escapeHtml(row.doctorName)}</td>
          <td>${window.HOMHelpers.formatDate(row.decided_at || row.created_at)}</td>
          <td>${window.HOMHelpers.daysSince(row.decided_at || row.created_at)} days</td>
          <td><span style="font-size: 12px; font-weight: 500; color: ${row.billsCleared ? 'var(--status-success-fg, #1b5e20)' : 'var(--status-warning-fg, #7a5300)'};">${row.billsCleared ? 'Bills cleared · PRE can release bed' : 'Awaiting Finance payment'}</span></td>
        </tr>
      `)
      .join('');
}

function populateDepartmentFilter() {
  const select = document.getElementById('patient-flow-department');
  if (!select) return;
  const current = flowFilters.department;
  const departments = [...new Set((flowData.rows || []).map((r) => r.department).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All Departments</option>' + departments.map((d) => `<option value="${d}">${d}</option>`).join('');
  select.value = current;
}

function matchesDateRange(row) {
  if (!flowFilters.dateRange) return true;
  const days = window.HOMHelpers.daysSince(row.decided_at || row.created_at);
  switch (flowFilters.dateRange) {
    case 'today':
      return days === 0;
    case 'last3':
      return days <= 3;
    case 'last7':
      return days <= 7;
    case 'older':
      return days > 7;
    default:
      return true;
  }
}

function getFilteredRows() {
  return (flowData.rows || []).filter((row) => {
    if (flowFilters.department && row.department !== flowFilters.department) return false;
    if (flowFilters.status && row.status !== flowFilters.status) return false;
    if (!matchesDateRange(row)) return false;
    if (!flowFilters.search) return true;
    const haystack = [row.patientUhid, row.patientName, row.department, row.bedNumber, row.doctorName].join(' ').toLowerCase();
    return haystack.includes(flowFilters.search);
  });
}

function renderPatientsTable() {
  const tbody = document.getElementById('patients-table-body');
  if (!tbody) return;

  const rows = getFilteredRows();
  const countEl = document.getElementById('patient-flow-count');
  if (countEl) {
    countEl.textContent = `Showing ${rows.length} patient${rows.length === 1 ? '' : 's'}`;
  }

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="padding: 24px; text-align: center; color: var(--text-secondary);">No patients match the selected filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      let actions = window.UI.Button({ variant: 'secondary', size: 'sm', children: 'View', onClick: `openPatientDetail(${row.pre_request_id})` });
      if (row.status === 'DISCHARGE_REQUESTED') {
        actions += window.UI.Button({ variant: 'primary', size: 'sm', children: 'Approve Discharge', onClick: `openDischargeModal(${row.pre_request_id})` });
      } else if (row.status === 'DISCHARGED') {
        actions += window.UI.Button({ variant: 'outline', size: 'sm', children: 'View Receipt', onClick: `openBillingFromUhid('${row.patientUhid}')` });
      }

      return `
        <tr>
          <td style="color: var(--text-secondary); font-weight: 500;">${window.HOMHelpers.escapeHtml(row.patientUhid)}</td>
          <td>
            <div style="font-weight: 500; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(row.patientName)}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${row.patientAge}</div>
          </td>
          <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.department || '-')}</td>
          <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.bedNumber)}</td>
          <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.doctorName)}</td>
          <td style="color: var(--text-secondary);">${window.HOMHelpers.formatDate(row.decided_at || row.created_at)}</td>
          <td style="color: var(--text-secondary);">${window.HOMHelpers.daysSince(row.decided_at || row.created_at)} days</td>
          <td>${window.UI.Badge({ variant: window.HOMHelpers.statusVariant(row.status), children: window.HOMHelpers.statusLabel(row.status) })}</td>
          <td><div style="display: flex; gap: 8px;">${actions}</div></td>
        </tr>
      `;
    })
    .join('');
}

// closeModals() now lives in hom-helpers.js (window.closeModals) — see that
// file for why removing this file's duplicate copy is safe: both
// openPatientDetail() and openDischargeModal() below already reset
// currentSelectedRequest and call setDischargeError('') themselves before
// showing a modal, so the extra resets this duplicate used to do on close
// were already redundant.

window.switchTab = function (tabId) {
  document.querySelectorAll('.modal-tab').forEach((tab) => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content-panel').forEach((panel) => panel.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`content-${tabId}`).classList.add('active');
};

async function findAdmissionAndLedger(patientId) {
  try {
    const bills = await window.ApiClient.billing.patient.bills(patientId);
    return bills.find((b) => b.ledger) || bills[0] || null;
  } catch (err) {
    return null;
  }
}

window.openPatientDetail = async function (preRequestId) {
  const row = (flowData.rows || []).find((r) => r.pre_request_id === preRequestId);
  if (!row) return;
  currentSelectedRequest = row;

  const initials = row.patientName.split(' ').map((n) => n[0]).join('').slice(0, 2);
  document.getElementById('pd-avatar').innerText = initials;
  document.getElementById('pd-name').innerText = row.patientName;
  document.getElementById('pd-uhid').innerText = row.patientUhid;
  document.getElementById('pd-dept').innerText = row.department || '-';
  document.getElementById('pd-status-badge').innerHTML = window.UI.Badge({ variant: window.HOMHelpers.statusVariant(row.status), children: window.HOMHelpers.statusLabel(row.status) });
  document.getElementById('pd-age').innerText = `${row.patientAge} / ${row.patientGender}`;
  document.getElementById('pd-contact').innerText = row.patientPhone;
  document.getElementById('pd-admitted').innerText = window.HOMHelpers.formatDate(row.decided_at || row.created_at);
  document.getElementById('pd-days').innerText = `${window.HOMHelpers.daysSince(row.decided_at || row.created_at)} days`;
  document.getElementById('pd-dept-detail').innerText = row.department || '-';
  document.getElementById('pd-bed').innerText = row.bedNumber;
  document.getElementById('pd-physician').innerText = row.doctorName;
  document.getElementById('pd-bed-info').innerText = row.bedNumber;
  document.getElementById('pd-blood-group').innerText = row.patientBloodGroup;
  document.getElementById('btn-pd-discharge').style.display = row.status === 'DISCHARGE_REQUESTED' ? 'block' : 'none';

  const billing = await findAdmissionAndLedger(row.patient_id);
  const [entries, services] = await Promise.all([
    billing && billing.ledger ? window.ApiClient.billing.ledger.entries(billing.ledger.ledger_id).catch(() => []) : Promise.resolve([]),
    window.ApiClient.billing.services.list().catch(() => []),
  ]);
  const servicesById = {};
  services.forEach((s) => (servicesById[s.service_id] = s));
  const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const tbody = document.getElementById('pd-charges-tbody');
  if (tbody) {
    tbody.innerHTML = entries.length
      ? entries
          .map(
            (e) =>
              `<tr><td>${window.HOMHelpers.escapeHtml(servicesById[e.service_id]?.service_name || 'Service #' + e.service_id)}</td><td>${e.quantity}</td><td>${window.HOMHelpers.formatCurrency(e.amount)}</td></tr>`,
          )
          .join('')
      : `<tr><td colspan="3" style="text-align:center; color: var(--text-secondary);">No billing ledger entries yet.</td></tr>`;
  }
  document.getElementById('pd-charges-total').innerText = window.HOMHelpers.formatCurrency(total);
  document.getElementById('pd-ledger-status').innerText = billing && billing.ledger ? billing.ledger.status : 'No ledger yet';

  switchTab('overview');
  document.getElementById('modal-patient-detail').classList.add('active');
};

window.openDischargeFromDetail = function () {
  if (!currentSelectedRequest) return;
  const preRequestId = currentSelectedRequest.pre_request_id;
  closeModals();
  openDischargeModal(preRequestId);
};

window.openDischargeModal = async function (preRequestId) {
  const row = (flowData.rows || []).find((r) => r.pre_request_id === preRequestId);
  if (!row) return;
  currentSelectedRequest = row;

  document.getElementById('discharge-title').innerText = `Approve Discharge — ${row.patientName}`;
  document.getElementById('d-patient').innerText = row.patientName;
  document.getElementById('d-uhid').innerText = row.patientUhid;
  document.getElementById('d-dept').innerText = row.department || 'General';
  document.getElementById('d-bed').innerText = row.bedNumber;
  document.getElementById('d-physician').innerText = row.doctorName || 'Staff Physician';
  document.getElementById('d-days').innerText = `${window.HOMHelpers.daysSince(row.decided_at || row.created_at)} days`;

  const totalCostEl = document.getElementById('d-total-cost');
  if (totalCostEl) totalCostEl.innerText = 'Calculating...';

  setDischargeError('');
  document.getElementById('modal-initiate-discharge').classList.add('active');

  const billing = await findAdmissionAndLedger(row.patient_id);
  if (billing && billing.ledger) {
    const entries = await window.ApiClient.billing.ledger.entries(billing.ledger.ledger_id).catch(() => []);
    const total = (Array.isArray(entries) ? entries : []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    if (totalCostEl) totalCostEl.innerText = window.HOMHelpers.formatCurrency(total);
  } else {
    if (totalCostEl) totalCostEl.innerText = '₹0';
  }
};

window.confirmDischarge = async function () {
  if (!currentSelectedRequest) return;
  if (currentSelectedRequest.status !== 'DISCHARGE_REQUESTED') {
    setDischargeError('This patient is not awaiting a HOM discharge clearance approval.');
    return;
  }

  setDischargeError('');
  try {
    await window.ApiClient.preRequests.update(currentSelectedRequest.pre_request_id, { status: 'DISCHARGE_APPROVED' });
    window.UIFeedback?.toast('Discharge clearance approved successfully. PRE notified to finalize release.', 'success');
  } catch (err) {
    setDischargeError(err.message || 'Unable to approve discharge clearance.');
    return;
  }
  closeModals();
  await loadAndRender();
};

function exportPatientFlow() {
  const rows = getFilteredRows();
  if (!rows.length) {
    window.UIFeedback.toast('There are no patient flow rows to export for the current filters.', 'warning');
    return;
  }

  const csv = [
    ['UHID', 'Patient', 'Department', 'Bed', 'Physician', 'Status', 'Days Stay'].join(','),
    ...rows.map((r) =>
      [r.patientUhid, r.patientName, r.department, r.bedNumber, r.doctorName, window.HOMHelpers.statusLabel(r.status), window.HOMHelpers.daysSince(r.decided_at || r.created_at)]
        .map(csvEscape)
        .join(','),
    ),
  ].join('\n');

  downloadCsv('hom-patient-flow.csv', csv);
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

window.openBillingFromDetail = function () {
  if (!currentSelectedRequest) return;
  openBillingFromUhid(currentSelectedRequest.patientUhid);
};

window.openBillingFromUhid = function (uhid) {
  window.location.href = `screen-05-billing.html?uhid=${encodeURIComponent(uhid)}`;
};
