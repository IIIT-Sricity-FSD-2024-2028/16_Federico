'use strict';

/**
 * Admin/dashboard.js — hospital-wide analytics.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const locked = !window.RoleAccess.hasModule('ANALYTICS');
  document.getElementById('analytics-locked-message').style.display = locked ? 'block' : 'none';
  if (locked) return;

  await loadAndRender();
});

async function loadAndRender() {
  const [wards, beds, patients, rawLedgers, items, staff] = await Promise.all([
    window.ApiClient.wards.list(),
    window.ApiClient.wards.beds(),
    window.ApiClient.patients.list(),
    window.ApiClient.billing.ledger.listAll().catch(() => []),
    window.ApiClient.inventory.items.list().catch(() => []),
    window.ApiClient.rbac.staff().catch(() => []),
  ]);

  // Ledgers carry no precomputed total — sum each one's entries, same as
  // HOM/billing.js's own billing view.
  const ledgers = await Promise.all(
    rawLedgers.map(async (ledger) => {
      const entries = await window.ApiClient.billing.ledger.entries(ledger.ledger_id).catch(() => []);
      const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { ...ledger, total };
    }),
  );

  renderMetrics(wards, beds, patients, ledgers);
  renderWardOccupancy(wards, beds);
  renderBillingSummary(ledgers);
  renderLowStock(items);
  renderStaffBreakdown(staff);
}

function renderMetrics(wards, beds, patients, ledgers) {
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const occupancyPct = beds.length ? Math.round((occupied / beds.length) * 100) : 0;
  const totalRevenue = ledgers.reduce((sum, l) => sum + Number(l.total || 0), 0);

  document.getElementById('metrics-container').innerHTML = `
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F7F6;">🏥</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${wards.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Departments / Wards</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #E0F2FE;">🛏️</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${occupancyPct}%</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Bed Occupancy (${occupied}/${beds.length})</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #D1FAE5;">👥</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${patients.length}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Registered Patients</div></div>
    </div>
    <div class="card" style="padding: 16px; flex-direction: row; gap: 12px; align-items: center;">
      <div class="metric-card-icon" style="background: #FEF3C7;">💰</div>
      <div><div style="font-size: 24px; font-weight: 600; line-height: 1;">${window.Formatters.formatCurrency(totalRevenue)}</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Total Billed (Live)</div></div>
    </div>
  `;
}

function renderWardOccupancy(wards, beds) {
  const container = document.getElementById('ward-occupancy-list');
  if (!wards.length) {
    container.innerHTML = '<div class="md-empty-state"><span>No wards yet — add one under Departments.</span></div>';
    return;
  }

  container.innerHTML = wards
    .map((ward) => {
      const wardBeds = beds.filter((b) => b.ward_id === ward.ward_id);
      const occupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
      const pct = wardBeds.length ? Math.round((occupied / wardBeds.length) * 100) : 0;
      return `
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <span style="font-weight: 500;">${window.Formatters.escapeHtml(ward.ward_name)}</span>
            <span style="color: var(--text-secondary);">${occupied}/${wardBeds.length}</span>
          </div>
          <div class="progress-bar-bg" style="height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; border-radius: 999px; background: ${pct >= 90 ? 'var(--error)' : pct >= 70 ? 'var(--warning)' : 'var(--success)'};"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderBillingSummary(ledgers) {
  const tbody = document.getElementById('billing-summary-tbody');
  const byStatus = {};
  ledgers.forEach((l) => {
    const key = l.status || 'UNKNOWN';
    if (!byStatus[key]) byStatus[key] = { count: 0, total: 0 };
    byStatus[key].count += 1;
    byStatus[key].total += Number(l.total || 0);
  });

  const rows = Object.entries(byStatus);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="padding: 24px; text-align: center; color: var(--text-secondary);">No billing ledgers yet.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(
      ([status, stats]) => `
      <tr>
        <td>${window.Formatters.escapeHtml(status)}</td>
        <td>${stats.count}</td>
        <td>${window.Formatters.formatCurrency(stats.total)}</td>
      </tr>
    `,
    )
    .join('');
}

function renderLowStock(items) {
  const container = document.getElementById('low-stock-list');
  const lowStock = items.filter((i) => i.stock_quantity < i.reorder_level);
  if (!lowStock.length) {
    container.innerHTML = '<div class="md-empty-state"><span>Nothing below its reorder level.</span></div>';
    return;
  }

  container.innerHTML = lowStock
    .map(
      (item) => `
      <div class="alert-card" style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-base); padding: 12px; margin-bottom: 12px;">
        <p style="font-size: 14px; font-weight: 500; color: var(--error-text); margin: 0 0 4px 0;">${window.Formatters.escapeHtml(item.item_name)}</p>
        <p style="font-size: 12px; color: var(--error-text); margin: 0;">${item.stock_quantity} of ${item.reorder_level} reorder level</p>
      </div>
    `,
    )
    .join('');
}

function renderStaffBreakdown(staff) {
  const container = document.getElementById('staff-breakdown');
  const byRole = {};
  staff.forEach((s) => {
    byRole[s.actor_role] = (byRole[s.actor_role] || 0) + 1;
  });

  const roles = Object.entries(byRole);
  if (!roles.length) {
    container.innerHTML = '<div class="md-empty-state"><span>No staff yet.</span></div>';
    return;
  }

  container.innerHTML = roles
    .map(
      ([role, count]) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
        <span style="font-size: 14px;">${window.Formatters.escapeHtml(role)}</span>
        <span style="font-weight: 600;">${count}</span>
      </div>
    `,
    )
    .join('');
}
