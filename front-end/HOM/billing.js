'use strict';

/**
 * billing.js — HOM Billing & Charges.
 */

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  applyUrlFilters();
  await loadAndRender();
});

// Delegated click handling for the billing table's "View" action — one
// listener instead of a per-row onclick="openBillingDetail(...)" string
// plus a matching window.openBillingDetail global (see renderTable() below).
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action="billing-detail"]');
  if (!trigger) return;
  openBillingDetail(Number(trigger.dataset.ledgerId));
});

let billingSearch = '';
let billingRows = [];
let leaderRows = [];
let availableServices = [];
let availableAdmissions = [];

function bindControls() {
  const searchInput = document.getElementById('billing-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      billingSearch = event.target.value.trim().toLowerCase();
      renderTable();
    });
  }
  document.getElementById('billing-export')?.addEventListener('click', exportBillingRows);

  // Post Service Used Controls (HOM -> FA)
  document.getElementById('btn-open-post-service')?.addEventListener('click', openPostServiceModal);
  document.getElementById('btn-submit-service')?.addEventListener('click', submitPostService);
  document.getElementById('post-service-select')?.addEventListener('change', updatePostTotalPreview);
  document.getElementById('post-quantity')?.addEventListener('input', updatePostTotalPreview);
}

function openPostServiceModal() {
  const admissionSelect = document.getElementById('post-admission-select');
  const serviceSelect = document.getElementById('post-service-select');
  const qtyInput = document.getElementById('post-quantity');
  const errorEl = document.getElementById('post-modal-error');

  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
  if (qtyInput) qtyInput.value = '1';

  // Populate Admissions / Patients with User ID / UHID
  if (admissionSelect) {
    admissionSelect.innerHTML = '<option value="">Select patient / user...</option>' +
      availableAdmissions.map((a) => `<option value="${a.admission_id}">User ID #${a.patient_id} — ${window.HOMHelpers.escapeHtml(a.patientName)} (${a.uhid || 'No UHID'})</option>`).join('');
  }

  // Populate Services
  if (serviceSelect) {
    serviceSelect.innerHTML = '<option value="">Select service used...</option>' +
      availableServices.map((s) => `<option value="${s.service_id}" data-cost="${s.base_cost}">${window.HOMHelpers.escapeHtml(s.service_name)} (${window.HOMHelpers.formatCurrency(s.base_cost)})</option>`).join('');
  }

  updatePostTotalPreview();
  document.getElementById('modal-post-service')?.classList.add('active');
}

function updatePostTotalPreview() {
  const serviceSelect = document.getElementById('post-service-select');
  const qtyInput = document.getElementById('post-quantity');
  const previewEl = document.getElementById('post-total-preview');

  if (!serviceSelect || !qtyInput || !previewEl) return;
  const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
  const unitPrice = selectedOpt ? Number(selectedOpt.getAttribute('data-cost') || 0) : 0;
  const qty = Number(qtyInput.value) || 1;
  previewEl.value = window.HOMHelpers.formatCurrency(unitPrice * qty);
}

async function submitPostService() {
  const admissionId = document.getElementById('post-admission-select')?.value;
  const serviceId = document.getElementById('post-service-select')?.value;
  const quantity = Number(document.getElementById('post-quantity')?.value) || 1;
  const errorEl = document.getElementById('post-modal-error');

  if (!admissionId) {
    if (errorEl) { errorEl.textContent = 'Please select a patient / user.'; errorEl.style.display = 'block'; }
    return;
  }
  if (!serviceId) {
    if (errorEl) { errorEl.textContent = 'Please select a service.'; errorEl.style.display = 'block'; }
    return;
  }
  if (quantity < 1) {
    if (errorEl) { errorEl.textContent = 'Quantity must be at least 1.'; errorEl.style.display = 'block'; }
    return;
  }

  try {
    const submitBtn = document.getElementById('btn-submit-service');
    if (submitBtn) submitBtn.disabled = true;

    await window.ApiClient.billing.leaders.create({
      admission_id: Number(admissionId),
      service_id: Number(serviceId),
      quantity: quantity,
    });

    window.UIFeedback?.toast('Service posted! Sent to FA Recent Charges for review and approval.', 'success');
    window.closeModals();
    await loadAndRender();
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || 'Failed to submit service.';
      errorEl.style.display = 'block';
    }
  } finally {
    const submitBtn = document.getElementById('btn-submit-service');
    if (submitBtn) submitBtn.disabled = false;
  }
}

function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const uhid = params.get('uhid');
  if (!uhid) return;
  billingSearch = uhid.toLowerCase();
  const input = document.getElementById('billing-search');
  if (input) input.value = uhid;
}

async function loadAndRender() {
  const [ledgers, admissions, patients, beds, preRequests, services, leaders] = await Promise.all([
    window.ApiClient.billing.ledger.listAll().catch(() => []),
    window.ApiClient.admissions.list().catch(() => []),
    window.ApiClient.patients.list(),
    window.ApiClient.wards.beds(),
    window.ApiClient.preRequests.list(),
    window.ApiClient.billing.services.list(),
    window.ApiClient.billing.leaders.list().catch(() => []),
  ]);

  const admissionsById = {};
  admissions.forEach((a) => (admissionsById[a.admission_id] = a));
  const patientsById = {};
  patients.forEach((p) => (patientsById[p.patient_id] = p));
  const bedsById = {};
  beds.forEach((b) => (bedsById[b.bed_id] = b));
  const servicesById = {};
  services.forEach((s) => (servicesById[s.service_id] = s));

  availableServices = services;
  availableAdmissions = admissions
    .filter((a) => a.status !== 'DISCHARGED')
    .map((a) => {
      const patient = patientsById[a.patient_id];
      return {
        admission_id: a.admission_id,
        patient_id: a.patient_id,
        patientName: patient?.name || 'Patient',
        uhid: patient?.uhid || '',
      };
    });

  leaderRows = (leaders || []).map((l) => {
    const admission = admissionsById[l.admission_id];
    const patient = l.patient_id ? patientsById[l.patient_id] : (admission ? patientsById[admission.patient_id] : null);
    const service = servicesById[l.service_id];
    return {
      ...l,
      patientName: patient?.name || 'Unknown Patient',
      uhid: patient?.uhid || '-',
      serviceName: service?.service_name || `Service #${l.service_id}`,
    };
  });

  const entriesByLedger = {};
  await Promise.all(
    ledgers.map(async (ledger) => {
      entriesByLedger[ledger.ledger_id] = await window.ApiClient.billing.ledger.entries(ledger.ledger_id).catch(() => []);
    }),
  );

  billingRows = ledgers.map((ledger) => {
    const admission = admissionsById[ledger.admission_id];
    const patient = admission ? patientsById[admission.patient_id] : null;
    const bed = admission ? bedsById[admission.bed_id] : null;
    const preRequest = admission ? preRequests.find((r) => r.patient_id === admission.patient_id && r.bed_id === admission.bed_id) : null;
    const entries = entriesByLedger[ledger.ledger_id] || [];
    const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return { ledger, admission, patient, bed, department: preRequest?.department || '-', entries, total, services };
  });

  renderMetrics();
  renderTable();
}

function getFilteredRows() {
  if (!billingSearch) return billingRows;
  return billingRows.filter((row) => {
    const haystack = [row.patient?.name, row.patient?.uhid, row.department, row.bed?.bed_number, row.ledger.status].join(' ').toLowerCase();
    return haystack.includes(billingSearch);
  });
}

function renderMetrics() {
  const rows = getFilteredRows();
  const totalBilled = rows.reduce((sum, r) => sum + r.total, 0);
  const pending = rows.filter((r) => r.ledger.status === 'OPEN' || r.ledger.status === 'DISPATCHED').length;
  const avg = rows.length ? Math.round(totalBilled / rows.length) : 0;

  const icons = {
    users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    dollar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    trend: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  };

  document.getElementById('metrics-container').innerHTML = `
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F7F6;">${icons.users}</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${rows.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Visible Ledgers</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F2FE;">${icons.dollar}</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${window.HOMHelpers.formatCurrency(totalBilled)}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Total Billed (Live)</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #FEF3C7;">${icons.clock}</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1; color: #F59E0B;">${pending}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Pending Finalization</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #D1FAE5;">${icons.trend}</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${window.HOMHelpers.formatCurrency(avg)}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Avg Ledger Total</div></div>
    </div>
  `;
}

function ledgerStatusVariant(status) {
  if (status === 'PAID') return 'success';
  if (status === 'DISPATCHED') return 'warning';
  return 'neutral';
}

function renderTable() {
  const tbody = document.getElementById('billing-tbody');
  if (!tbody) return;

  const rows = getFilteredRows();
  document.getElementById('pagination-text').innerText = `Showing 1-${rows.length} of ${rows.length} ledgers`;

  window.DomTable.renderRows(tbody, rows, {
    colspan: 7,
    emptyMessage: 'No billing ledgers match the current search.',
    toRow: (row) => `
      <tr>
        <td style="font-weight: 500; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(row.patient?.name || '-')}</td>
        <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.patient?.uhid || '-')}</td>
        <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.department)}</td>
        <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.bed?.bed_number || '-')}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${window.HOMHelpers.formatCurrency(row.total)}</td>
        <td>${window.UI.Badge({ variant: ledgerStatusVariant(row.ledger.status), children: row.ledger.status })}</td>
        <td>${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'View', dataAttrs: { action: 'billing-detail', ledgerId: row.ledger.ledger_id } })}</td>
      </tr>
    `,
  });
}

async function openBillingDetail(ledgerId) {
  const row = billingRows.find((r) => r.ledger.ledger_id === ledgerId);
  if (!row) return;

  const servicesById = {};
  (row.services || []).forEach((s) => (servicesById[s.service_id] = s));

  document.getElementById('bd-title').innerText = `Billing Details - ${row.patient?.name || 'Patient'}`;
  document.getElementById('bd-uhid').innerText = row.patient?.uhid || '-';
  document.getElementById('bd-dept').innerText = row.department;
  document.getElementById('bd-bed').innerText = row.bed?.bed_number || '-';
  document.getElementById('bd-status').innerHTML = window.UI.Badge({ variant: ledgerStatusVariant(row.ledger.status), children: row.ledger.status });

  const tbody = document.getElementById('bd-entries-tbody');
  tbody.innerHTML = row.entries.length
    ? row.entries
        .map(
          (e) => `
      <tr>
        <td>${window.HOMHelpers.escapeHtml(servicesById[e.service_id]?.service_name || 'Service #' + e.service_id)}</td>
        <td style="text-align: right;">${e.quantity}</td>
        <td style="text-align: right;">${window.HOMHelpers.formatCurrency(e.unit_price)}</td>
        <td style="text-align: right; font-weight: 500;">${window.HOMHelpers.formatCurrency(e.amount)}</td>
      </tr>
    `,
        )
        .join('')
    : `<tr><td colspan="4" style="text-align:center; color: var(--text-secondary);">No line items yet.</td></tr>`;

  document.getElementById('bd-total').innerText = window.HOMHelpers.formatCurrency(row.total);

  const payments = await window.ApiClient.billing.payments.list().catch(() => []);
  const ledgerPayments = payments.filter((p) => p.ledger_id === ledgerId);
  const paymentsBox = document.getElementById('bd-payments');
  paymentsBox.innerHTML = ledgerPayments.length
    ? ledgerPayments
        .map((p) => `<p style="font-size: 14px; margin: 0 0 6px 0;">${window.HOMHelpers.formatCurrency(p.amount_paid)} via ${window.HOMHelpers.escapeHtml(p.payment_mode)} — ${window.HOMHelpers.formatDateTime(p.payment_time)}</p>`)
        .join('')
    : `<p style="font-size: 14px; color: var(--text-secondary); margin: 0;">No payments recorded yet.</p>`;

  document.getElementById('modal-billing-detail').classList.add('active');
}

function exportBillingRows() {
  const rows = getFilteredRows();
  if (!rows.length) {
    window.UIFeedback.toast('There are no billing rows to export for the current search.', 'warning');
    return;
  }

  const csv = [
    ['Patient', 'UHID', 'Department', 'Bed', 'Total', 'Status'].join(','),
    ...rows.map((r) => [r.patient?.name, r.patient?.uhid, r.department, r.bed?.bed_number, r.total, r.ledger.status].map(csvEscape).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hom-billing-ledger.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
