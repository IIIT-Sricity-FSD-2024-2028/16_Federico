/**
 * billing.js — Phase 3 rewrite.
 *
 * Read-only billing monitoring view for HOM, backed by the real
 * ledger/ledgerEntry/payment tables (billing/ledgers, added in Phase 2
 * specifically for this page — the service function already existed,
 * it just had no route). HOM has read-only access here by design
 * (ACTOR_ACCESS.billing.write is FA-only) — creating/dispatching ledgers
 * is Finance Associate's job, not HOM's.
 */

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  applyUrlFilters();
  await loadAndRender();
});

let billingSearch = '';
let billingRows = [];

function bindControls() {
  const searchInput = document.getElementById('billing-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      billingSearch = event.target.value.trim().toLowerCase();
      renderTable();
    });
  }
  document.getElementById('billing-export')?.addEventListener('click', exportBillingRows);
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
  const [ledgers, admissions, patients, beds, preRequests, services] = await Promise.all([
    window.ApiClient.billing.ledger.listAll().catch(() => []),
    window.ApiClient.admissions.list().catch(() => []),
    window.ApiClient.patients.list(),
    window.ApiClient.wards.beds(),
    window.ApiClient.preRequests.list(),
    window.ApiClient.billing.services.list(),
  ]);

  const admissionsById = {};
  admissions.forEach((a) => (admissionsById[a.admission_id] = a));
  const patientsById = {};
  patients.forEach((p) => (patientsById[p.patient_id] = p));
  const bedsById = {};
  beds.forEach((b) => (bedsById[b.bed_id] = b));

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

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--text-secondary);">No billing ledgers match the current search.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td style="font-weight: 500; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(row.patient?.name || '-')}</td>
        <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.patient?.uhid || '-')}</td>
        <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.department)}</td>
        <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.bed?.bed_number || '-')}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${window.HOMHelpers.formatCurrency(row.total)}</td>
        <td>${window.UI.Badge({ variant: ledgerStatusVariant(row.ledger.status), children: row.ledger.status })}</td>
        <td>${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'View', onClick: `openBillingDetail(${row.ledger.ledger_id})` })}</td>
      </tr>
    `,
    )
    .join('');
}

window.openBillingDetail = async function (ledgerId) {
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
};

window.closeModals = function () {
  document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.remove('active'));
};

function exportBillingRows() {
  const rows = getFilteredRows();
  if (!rows.length) {
    alert('There are no billing rows to export for the current search.');
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
