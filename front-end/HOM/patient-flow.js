'use strict';

/**
 * patient-flow.js — HOM Patient Flow & Admissions.
 */

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  await loadAndRender();
});

let flowData = {};
let currentSelectedRequest = null;
let flowFilters = { search: '', department: '', status: '', dateRange: '' };

function bindControls() {
  ['patient-flow-search', 'patient-flow-filter-search'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', (event) => {
      flowFilters.search = event.target.value.trim().toLowerCase();
      syncSearchInputs(event.target.value);
      renderPatientsTable();
    });
  });

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
    syncSearchInputs('');
    document.getElementById('patient-flow-department').value = '';
    document.getElementById('patient-flow-status').value = '';
    document.getElementById('patient-flow-date-range').value = '';
    renderPatientsTable();
  });

  document.getElementById('patient-flow-export')?.addEventListener('click', exportPatientFlow);
}

function syncSearchInputs(value) {
  ['patient-flow-search', 'patient-flow-filter-search'].forEach((id) => {
    const input = document.getElementById(id);
    if (input && input.value !== value) input.value = value;
  });
}

function setDischargeError(message) {
  const el = document.getElementById('discharge-form-error');
  if (!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
}

const FLOW_STATUSES = ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED', 'DISCHARGED'];

async function loadAndRender() {
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

  const joined = window.HOMHelpers.joinPreRequestsWithPatients(
    preRequests.filter((r) => FLOW_STATUSES.includes(r.status)),
    patients,
    doctorsById,
  ).map((r) => ({ ...r, bedNumber: bedsById[r.bed_id]?.bed_number || '-' }));

  flowData = { rows: joined, bedsById };
  populateDepartmentFilter();
  renderPatientsTable();
  renderDispatchQueue();
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

const STATUS_FILTER_MAP = { Admitted: 'ADMITTED', 'Pending Discharge': 'DISCHARGE_REQUESTED', Critical: '__NONE__', Discharged: 'DISCHARGED' };

function getFilteredRows() {
  return (flowData.rows || []).filter((row) => {
    if (flowFilters.department && row.department !== flowFilters.department) return false;
    if (flowFilters.status && row.status !== (STATUS_FILTER_MAP[flowFilters.status] || flowFilters.status)) return false;
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

window.openDischargeModal = function (preRequestId) {
  const row = (flowData.rows || []).find((r) => r.pre_request_id === preRequestId);
  if (!row) return;
  currentSelectedRequest = row;

  document.getElementById('discharge-title').innerText = `Approve Discharge - ${row.patientName}`;
  document.getElementById('d-patient').innerText = row.patientName;
  document.getElementById('d-uhid').innerText = row.patientUhid;
  document.getElementById('d-bed').innerText = row.bedNumber;
  document.getElementById('d-days').innerText = `${window.HOMHelpers.daysSince(row.decided_at || row.created_at)} days`;
  setDischargeError('');
  document.getElementById('modal-initiate-discharge').classList.add('active');
};

window.confirmDischarge = async function () {
  if (!currentSelectedRequest) return;
  if (currentSelectedRequest.status !== 'DISCHARGE_REQUESTED') {
    setDischargeError('This patient is not awaiting a HOM discharge approval.');
    return;
  }

  setDischargeError('');
  try {
    await window.ApiClient.preRequests.update(currentSelectedRequest.pre_request_id, { status: 'DISCHARGE_APPROVED' });
  } catch (err) {
    setDischargeError(err.message || 'Unable to approve discharge.');
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

async function renderDispatchQueue() {
  const section = document.getElementById('fa-dispatch-queue-section');
  if (!section) return;

  let ledgers = [];
  try {
    ledgers = (await window.ApiClient.billing.ledger.listAll()).filter((l) => l.status === 'DISPATCHED');
  } catch (err) {
    ledgers = [];
  }

  if (!ledgers.length) {
    section.innerHTML = `
      <div class="card" style="padding: 24px;">
        <h3 style="margin: 0 0 8px 0;">FA Dispatch Queue</h3>
        <p style="margin: 0; color: var(--text-secondary);">No bills dispatched by FA yet.</p>
      </div>
    `;
    return;
  }

  section.innerHTML = `
    <div class="card" style="padding: 24px;">
      <h3 style="margin: 0 0 16px 0;">FA Dispatch Queue</h3>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Admission</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${ledgers
              .map(
                (l) => `
              <tr>
                <td>#${l.admission_id}</td>
                <td>${window.UI.Badge({ variant: 'warning', children: l.status })}</td>
                <td>${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'View in Billing', onClick: `window.location.href='screen-05-billing.html'` })}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
