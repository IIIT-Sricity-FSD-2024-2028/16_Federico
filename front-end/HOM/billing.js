'use strict';

/**
 * billing.js — HOM Patient Billing Ledger.
 *
 * Responsibilities:
 *  - Fetch and display all billing ledgers with live totals derived from ledger entries.
 *  - Allow HOM to post a service charge which is forwarded to FA for approval.
 *  - Search and filter ledgers by patient name/UHID and ledger status.
 *  - Export filtered ledger data as CSV.
 *  - Auto-refresh every 15 seconds when the tab is visible.
 */

// ── Module State ──────────────────────────────────────────────────────────────

/** @type {Array<BillingRow>} Enriched ledger rows for the current render cycle. */
let billingRows = [];

/** @type {string} Lower-case text search query. */
let billingSearch = '';

/** @type {string} Active status filter (e.g., 'OPEN', 'PAID', ''). */
let billingStatusFilter = '';

/** @type {Array<object>} All available billing services from the API. */
let availableServices = [];

/** @type {Array<object>} Active (non-discharged) admissions for the Post Service modal. */
let availableAdmissions = [];

/**
 * Services indexed by service_id for O(1) lookups in detail modal.
 * Populated once on load and reused across every openBillingDetail call.
 * @type {Record<number, object>}
 */
let servicesById = {};

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  applyUrlFilters();
  await loadAndRender();

  // Auto-refresh every 15 seconds when tab is visible
  setInterval(() => {
    if (!document.hidden) loadAndRender();
  }, 15_000);

  // Instant refresh on tab regain focus
  window.addEventListener('focus', loadAndRender);
});

// Delegated click for "View Detail" table action buttons
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action="billing-detail"]');
  if (!trigger) return;
  openBillingDetail(Number(trigger.dataset.ledgerId));
});

// ── Control Binding ───────────────────────────────────────────────────────────

function bindControls() {
  const searchInput = document.getElementById('billing-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      billingSearch = e.target.value.trim().toLowerCase();
      renderTable();
      renderMetrics();
    });
  }

  const statusFilter = document.getElementById('billing-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      billingStatusFilter = e.target.value;
      renderTable();
      renderMetrics();
    });
  }

  document.getElementById('billing-clear-filters')?.addEventListener('click', () => {
    billingSearch = '';
    billingStatusFilter = '';
    const searchEl = document.getElementById('billing-search');
    const statusEl = document.getElementById('billing-status-filter');
    if (searchEl) searchEl.value = '';
    if (statusEl) statusEl.value = '';
    renderTable();
    renderMetrics();
  });

  document.getElementById('billing-export')?.addEventListener('click', exportBillingRows);
  document.getElementById('btn-open-post-service')?.addEventListener('click', openPostServiceModal);
  document.getElementById('btn-submit-service')?.addEventListener('click', submitPostService);

  // Live charge preview in Post Service modal
  document.getElementById('post-service-select')?.addEventListener('change', updatePostTotalPreview);
  document.getElementById('post-quantity')?.addEventListener('input', updatePostTotalPreview);
}

/**
 * Pre-fills the search input from the URL's ?uhid= query parameter.
 * Allows deep-linking directly to a patient's ledger from another screen.
 */
function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const uhid = params.get('uhid');
  if (!uhid) return;
  billingSearch = uhid.toLowerCase();
  const input = document.getElementById('billing-search');
  if (input) input.value = uhid;
}

// ── Data Loading ──────────────────────────────────────────────────────────────

/**
 * Loads all required data concurrently and rebuilds the enriched row model.
 * Approach: O(L × E) where L = ledger count, E = entries per ledger — acceptable
 * for hospital-scale data (hundreds of ledgers max).
 */
async function loadAndRender() {
  try {
    const [ledgers, admissions, patients, beds, preRequests, services] = await Promise.all([
      window.ApiClient.billing.ledger.listAll().catch(() => []),
      window.ApiClient.admissions.list().catch(() => []),
      window.ApiClient.patients.list().catch(() => []),
      window.ApiClient.wards.beds().catch(() => []),
      window.ApiClient.preRequests.list().catch(() => []),
      window.ApiClient.billing.services.list().catch(() => []),
    ]);

    // Build lookup maps — O(n) one-time cost
    const admissionsById = Object.fromEntries(admissions.map((a) => [a.admission_id, a]));
    const patientsById = Object.fromEntries(patients.map((p) => [p.patient_id, p]));
    const bedsById = Object.fromEntries(beds.map((b) => [b.bed_id, b]));

    // Module-level services map reused by openBillingDetail
    servicesById = Object.fromEntries(services.map((s) => [s.service_id, s]));
    availableServices = services;

    // Only active (non-discharged) admissions appear in Post Service dropdown
    availableAdmissions = admissions
      .filter((a) => a.status !== 'DISCHARGED')
      .map((a) => {
        const patient = patientsById[a.patient_id] || {};
        return {
          admission_id: a.admission_id,
          patient_id: a.patient_id,
          patientName: patient.name || 'Patient',
          uhid: patient.uhid || '',
        };
      });

    // Fetch ledger entries concurrently — one request per ledger
    const entriesByLedger = {};
    await Promise.all(
      ledgers.map(async (ledger) => {
        entriesByLedger[ledger.ledger_id] = await window.ApiClient.billing.ledger
          .entries(ledger.ledger_id)
          .catch(() => []);
      }),
    );

    // Build enriched row model
    billingRows = ledgers.map((ledger) => {
      const admission = admissionsById[ledger.admission_id] || null;
      const patient = admission ? (patientsById[admission.patient_id] || null) : null;
      const bed = admission ? (bedsById[admission.bed_id] || null) : null;

      // Department comes from pre-request linked to this admission
      const preRequest = admission
        ? preRequests.find((r) => r.patient_id === admission.patient_id)
        : null;

      const entries = entriesByLedger[ledger.ledger_id] || [];
      // Total billed is the sum of all approved line-item amounts
      const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      return {
        ledger,
        admission,
        patient,
        bed,
        department: preRequest?.department || admission?.department || '—',
        entries,
        total,
      };
    });

    renderMetrics();
    renderTable();
  } catch (err) {
    window.UIFeedback?.toast(`Failed to load billing data: ${err.message || 'Unknown error'}`, 'error');
  }
}

// ── Filtering ─────────────────────────────────────────────────────────────────

function getFilteredRows() {
  return billingRows.filter((row) => {
    if (billingStatusFilter && row.ledger.status !== billingStatusFilter) return false;

    if (billingSearch) {
      const haystack = [
        row.patient?.name,
        row.patient?.uhid,
        row.department,
        row.bed?.bed_number,
        row.ledger.status,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(billingSearch)) return false;
    }

    return true;
  });
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderMetrics() {
  const allRows = billingRows;
  const visibleRows = getFilteredRows();

  const totalBilled = allRows.reduce((sum, r) => sum + r.total, 0);
  const pendingCount = allRows.filter(
    (r) => r.ledger.status === 'OPEN' || r.ledger.status === 'DISPATCHED',
  ).length;
  const paidCount = allRows.filter((r) => r.ledger.status === 'PAID').length;
  const avgVisible = visibleRows.length
    ? Math.round(visibleRows.reduce((sum, r) => sum + r.total, 0) / visibleRows.length)
    : 0;

  const container = document.getElementById('metrics-container');
  if (!container) return;

  container.innerHTML = `
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Total Ledgers</div>
        <div class="kpi-value">${allRows.length}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: 'info', children: `${visibleRows.length} Visible` })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Gross Billed</div>
        <div class="kpi-value" style="color: var(--status-success-fg, #1b5e20);">${window.HOMHelpers.formatCurrency(totalBilled)}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: 'success', children: 'All Time' })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Pending Finalization</div>
        <div class="kpi-value" style="color: ${pendingCount > 0 ? 'var(--status-warning-fg, #7a5300)' : 'var(--text-primary)'};">${pendingCount}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: pendingCount > 0 ? 'warning' : 'success', children: pendingCount > 0 ? `${pendingCount} Open/Dispatched` : 'All Settled' })}
      </div>
    </div>
    <div class="kpi-card">
      <div>
        <div class="kpi-label">Paid Ledgers</div>
        <div class="kpi-value">${paidCount}</div>
      </div>
      <div class="kpi-footer">
        ${window.UI.Badge({ variant: paidCount > 0 ? 'success' : 'neutral', children: `Avg ${window.HOMHelpers.formatCurrency(avgVisible)}` })}
      </div>
    </div>
  `;
}

/**
 * Returns the badge variant for a given ledger status string.
 * @param {string} status
 * @returns {'success'|'warning'|'neutral'}
 */
function ledgerStatusVariant(status) {
  if (status === 'PAID') return 'success';
  if (status === 'DISPATCHED') return 'warning';
  if (status === 'OPEN') return 'info';
  return 'neutral';
}

function renderTable() {
  const tbody = document.getElementById('billing-tbody');
  if (!tbody) return;

  const rows = getFilteredRows();

  const paginationEl = document.getElementById('pagination-text');
  if (paginationEl) {
    paginationEl.textContent =
      rows.length === billingRows.length
        ? `Showing all ${rows.length} ledger${rows.length === 1 ? '' : 's'}`
        : `Showing ${rows.length} of ${billingRows.length} ledgers (filtered)`;
  }

  window.DomTable.renderRows(tbody, rows, {
    colspan: 8,
    emptyMessage: 'No billing ledgers match the current search or filter.',
    toRow: (row) => `
      <tr>
        <td style="font-weight: 500; color: var(--text-primary);">${window.HOMHelpers.escapeHtml(row.patient?.name || '—')}</td>
        <td style="color: var(--text-secondary); font-family: monospace; font-size: 12px;">${window.HOMHelpers.escapeHtml(row.patient?.uhid || '—')}</td>
        <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.department)}</td>
        <td style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(row.bed?.bed_number || '—')}</td>
        <td style="color: var(--text-muted); font-size: 12px;">${window.HOMHelpers.formatDate(row.admission?.admitted_at || row.admission?.created_at)}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${window.HOMHelpers.formatCurrency(row.total)}</td>
        <td>${window.UI.Badge({ variant: ledgerStatusVariant(row.ledger.status), children: row.ledger.status })}</td>
        <td>${window.UI.Button({ variant: 'secondary', size: 'sm', children: 'View Detail', dataAttrs: { action: 'billing-detail', ledgerId: row.ledger.ledger_id } })}</td>
      </tr>
    `,
  });
}

// ── Post Service Modal ────────────────────────────────────────────────────────

function openPostServiceModal() {
  const admissionSelect = document.getElementById('post-admission-select');
  const serviceSelect = document.getElementById('post-service-select');
  const qtyInput = document.getElementById('post-quantity');
  const errorEl = document.getElementById('post-modal-error');

  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  if (qtyInput) qtyInput.value = '1';

  if (admissionSelect) {
    admissionSelect.innerHTML =
      '<option value="">Select patient...</option>' +
      availableAdmissions
        .map((a) => `<option value="${a.admission_id}">${window.HOMHelpers.escapeHtml(a.patientName)} — ${a.uhid || 'No UHID'}</option>`)
        .join('');
  }

  if (serviceSelect) {
    serviceSelect.innerHTML =
      '<option value="">Select service...</option>' +
      availableServices
        .map((s) => `<option value="${s.service_id}" data-cost="${s.base_cost}">${window.HOMHelpers.escapeHtml(s.service_name)} (${window.HOMHelpers.formatCurrency(s.base_cost)})</option>`)
        .join('');
  }

  updatePostTotalPreview();
  document.getElementById('modal-post-service')?.classList.add('active');
}

/**
 * Updates the read-only charge preview based on selected service × quantity.
 * Reads the `data-cost` attribute set on each <option> to avoid an extra API call.
 */
function updatePostTotalPreview() {
  const serviceSelect = document.getElementById('post-service-select');
  const qtyInput = document.getElementById('post-quantity');
  const previewEl = document.getElementById('post-total-preview');
  if (!serviceSelect || !qtyInput || !previewEl) return;

  const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
  const unitPrice = selectedOpt ? Number(selectedOpt.getAttribute('data-cost') || 0) : 0;
  const qty = Math.max(1, Number(qtyInput.value) || 1);
  previewEl.value = window.HOMHelpers.formatCurrency(unitPrice * qty);
}

async function submitPostService() {
  const admissionId = document.getElementById('post-admission-select')?.value;
  const serviceId = document.getElementById('post-service-select')?.value;
  const quantity = Math.max(1, Number(document.getElementById('post-quantity')?.value) || 1);
  const errorEl = document.getElementById('post-modal-error');
  const submitBtn = document.getElementById('btn-submit-service');

  // Clear previous error
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

  if (!admissionId) {
    showPostError('Please select a patient.', errorEl);
    return;
  }
  if (!serviceId) {
    showPostError('Please select a service.', errorEl);
    return;
  }
  if (quantity < 1) {
    showPostError('Quantity must be at least 1.', errorEl);
    return;
  }

  try {
    if (submitBtn) submitBtn.disabled = true;

    await window.ApiClient.billing.leaders.create({
      admission_id: Number(admissionId),
      service_id: Number(serviceId),
      quantity,
    });

    window.UIFeedback?.toast('Service posted — forwarded to FA for approval.', 'success');
    window.closeModals?.();
    await loadAndRender();
  } catch (err) {
    showPostError(err.message || 'Failed to submit. Please try again.', errorEl);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/**
 * Shows an error message inside the Post Service modal error container.
 * @param {string} message
 * @param {HTMLElement|null} errorEl
 */
function showPostError(message, errorEl) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

// ── Billing Detail Modal ──────────────────────────────────────────────────────

async function openBillingDetail(ledgerId) {
  const row = billingRows.find((r) => r.ledger.ledger_id === ledgerId);
  if (!row) return;

  // Update modal title and patient summary bar
  document.getElementById('bd-title').textContent = `Billing Detail — ${row.patient?.name || 'Patient'}`;
  document.getElementById('bd-uhid').textContent = row.patient?.uhid || '—';
  document.getElementById('bd-dept').textContent = row.department;
  document.getElementById('bd-bed').textContent = row.bed?.bed_number || '—';
  document.getElementById('bd-admission-date').textContent =
    window.HOMHelpers.formatDate(row.admission?.admitted_at || row.admission?.created_at);
  document.getElementById('bd-status').innerHTML = window.UI.Badge({
    variant: ledgerStatusVariant(row.ledger.status),
    children: row.ledger.status,
  });

  // Charges breakdown — uses module-level servicesById (no O(n²) per-row storage)
  const tbody = document.getElementById('bd-entries-tbody');
  if (tbody) {
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
      : `<tr><td colspan="4" style="text-align: center; padding: 16px; color: var(--text-secondary); font-size: 13px;">No charge line items recorded yet.</td></tr>`;
  }

  document.getElementById('bd-total').textContent = window.HOMHelpers.formatCurrency(row.total);

  // "View Patient Record" passes UHID as a query param for deep-linking
  const viewPatientBtn = document.getElementById('bd-view-patient-btn');
  if (viewPatientBtn && row.patient?.uhid) {
    viewPatientBtn.onclick = () => {
      window.location.href = `screen-03-patient-flow.html?uhid=${encodeURIComponent(row.patient.uhid)}`;
    };
    viewPatientBtn.disabled = false;
  } else if (viewPatientBtn) {
    viewPatientBtn.disabled = true;
  }

  document.getElementById('modal-billing-detail')?.classList.add('active');

  // Load payment history asynchronously after modal is visible
  await loadPaymentHistory(ledgerId);
}

/**
 * Fetches and renders payment history for a specific ledger.
 * Called after the billing detail modal is already visible for perceived performance.
 * @param {number} ledgerId
 */
async function loadPaymentHistory(ledgerId) {
  const paymentsBox = document.getElementById('bd-payments');
  if (!paymentsBox) return;

  try {
    const payments = await window.ApiClient.billing.payments.list().catch(() => []);
    const ledgerPayments = payments.filter((p) => p.ledger_id === ledgerId);

    paymentsBox.innerHTML = ledgerPayments.length
      ? ledgerPayments
          .map(
            (p) =>
              `<p style="font-size: 13px; margin: 0 0 6px 0; color: var(--text-primary);">
                <strong>${window.HOMHelpers.formatCurrency(p.amount_paid)}</strong>
                via <span style="color: var(--text-secondary);">${window.HOMHelpers.escapeHtml(p.payment_mode)}</span>
                — ${window.HOMHelpers.formatDateTime(p.payment_time)}
              </p>`,
          )
          .join('')
      : `<p style="font-size: 13px; color: var(--text-secondary); margin: 0;">No payments recorded yet.</p>`;
  } catch {
    paymentsBox.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); margin: 0;">Could not load payment history.</p>`;
  }
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportBillingRows() {
  const rows = getFilteredRows();
  if (!rows.length) {
    window.UIFeedback?.toast('No ledgers to export for the current filter.', 'warning');
    return;
  }

  const csv = [
    ['Patient', 'UHID', 'Department', 'Bed', 'Admission Date', 'Total Billed', 'Status'].join(','),
    ...rows.map((r) =>
      [
        r.patient?.name,
        r.patient?.uhid,
        r.department,
        r.bed?.bed_number,
        r.admission?.admitted_at || r.admission?.created_at,
        r.total,
        r.ledger.status,
      ]
        .map(csvEscape)
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hom-billing-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Escapes a value for safe CSV output.
 * @param {*} value
 * @returns {string}
 */
function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
