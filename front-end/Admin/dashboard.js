'use strict';

/**
 * Admin/dashboard.js — hospital-wide operational analytics & SaaS usage transparency.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const locked = !window.RoleAccess.hasModule('ANALYTICS');
  document.getElementById('analytics-locked-message').style.display = locked ? 'block' : 'none';
  if (locked) return;

  await loadAndRender();
});

async function loadAndRender() {
  const [wards, beds, patients, rawLedgers, items, staff, payments, admissions, preRequests, appointments, doctors, liveRates] = await Promise.all([
    window.ApiClient.wards.list().catch(() => []),
    window.ApiClient.wards.beds().catch(() => []),
    window.ApiClient.patients.list().catch(() => []),
    window.ApiClient.billing.ledger.listAll().catch(() => []),
    window.ApiClient.inventory.items.list().catch(() => []),
    window.ApiClient.rbac.staff().catch(() => []),
    window.ApiClient.billing.payments.list().catch(() => []),
    window.ApiClient.admissions.list().catch(() => []),
    window.ApiClient.preRequests.list().catch(() => []),
    window.ApiClient.appointments.list().catch(() => []),
    window.ApiClient.doctors.list().catch(() => []),
    window.ApiClient.platform.rates.get().catch(() => null),
  ]);

  // Sum each ledger's entries for accurate total
  const ledgers = await Promise.all(
    rawLedgers.map(async (ledger) => {
      const entries = await window.ApiClient.billing.ledger.entries(ledger.ledger_id).catch(() => []);
      const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { ...ledger, total };
    }),
  );

  renderMetrics(wards, beds, patients, ledgers, payments, admissions, preRequests, appointments);
  renderSubscriptionUsage(beds, doctors, staff, admissions, items, liveRates);
  renderWardOccupancy(wards, beds);
  renderBillingSummary(ledgers);
  renderLowStock(items);
  renderStaffBreakdown(staff);
}

function renderMetrics(wards, beds, patients, ledgers, payments = [], admissions = [], preRequests = [], appointments = []) {
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const occupancyPct = beds.length ? Math.round((occupied / beds.length) * 100) : 0;
  const totalRevenue = ledgers.reduce((sum, l) => sum + Number(l.total || 0), 0);
  const collected = (payments || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const activeInpatients = (admissions || []).filter((a) => a.status !== 'DISCHARGED').length;
  const dischargeQueue = (preRequests || []).filter(
    (p) => p.status === 'DISCHARGE_REQUESTED' || p.status === 'DISCHARGE_APPROVED',
  ).length;

  document.getElementById('metrics-container').innerHTML = `
    <div class="card" style="padding: 18px 20px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Active Inpatients</div>
      <div style="font-size: 26px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">${activeInpatients}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${dischargeQueue} pending discharge</div>
    </div>
    <div class="card" style="padding: 18px 20px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Bed Occupancy</div>
      <div style="font-size: 26px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">${occupancyPct}%</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${occupied} of ${beds.length} beds occupied</div>
    </div>
    <div class="card" style="padding: 18px 20px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Registered Patients</div>
      <div style="font-size: 26px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">${patients.length}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Across all departments</div>
    </div>
    <div class="card" style="padding: 18px 20px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Total Appointments</div>
      <div style="font-size: 26px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">${appointments.length}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Booked through portal / PRE</div>
    </div>
    <div class="card" style="padding: 18px 20px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Total Revenue Billed</div>
      <div style="font-size: 26px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">${window.Formatters.formatCurrency(totalRevenue)}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Cumulative hospital charges</div>
    </div>
    <div class="card" style="padding: 18px 20px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Payments Settled</div>
      <div style="font-size: 26px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">${window.Formatters.formatCurrency(collected)}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Direct cash & online receipts</div>
    </div>
  `;
}

function renderSubscriptionUsage(beds = [], doctors = [], staff = [], admissions = [], items = [], liveRates = null) {
  const container = document.getElementById('subscription-usage-breakdown');
  if (!container) return;

  const basePlatformFee = Number(liveRates?.base_fee ?? 3000);
  const bedRate = Number(liveRates?.rates?.GENERAL_BEDS ?? 150);
  const docRate = Number(liveRates?.rates?.DOCTOR_SEATS ?? 150);
  const staffRate = Number(liveRates?.rates?.STAFF_SEATS ?? 200);
  const termRate = Number(liveRates?.rates?.BILLING_TERMINALS ?? 500);
  const whRate = Number(liveRates?.rates?.WAREHOUSES ?? 1000);
  const admRate = Number(liveRates?.rates?.PATIENT_ADMISSIONS ?? 10);

  const bedCount = beds.length || 0;
  const bedCost = bedCount * bedRate;

  const docCount = doctors.length || 0;
  const docCost = docCount * docRate;

  const staffCount = staff.length || 0;
  const staffCost = staffCount * staffRate;

  const terminalsCount = 2;
  const terminalsCost = terminalsCount * termRate;

  const warehouseCount = 1;
  const warehouseCost = warehouseCount * whRate;

  const admCount = admissions.length || 0;
  const admCost = admCount * admRate;

  const subtotal = basePlatformFee + bedCost + docCost + staffCost + terminalsCost + warehouseCost + admCost;
  const gst = Math.round(subtotal * 0.18);
  const totalMonthly = subtotal + gst;

  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; font-size: 13px;">
      <div style="padding: 12px 14px; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;">
        <div style="color: var(--text-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase;">Base Platform Fee</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${inr(basePlatformFee)}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">All 8 modules unlocked</div>
      </div>
      <div style="padding: 12px 14px; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;">
        <div style="color: var(--text-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase;">Inpatient Beds</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${inr(bedCost)}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${bedCount} beds (@ ${inr(bedRate)}/bed)</div>
      </div>
      <div style="padding: 12px 14px; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;">
        <div style="color: var(--text-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase;">Doctors &amp; Staff</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${inr(docCost + staffCost)}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${docCount} docs (@ ${inr(docRate)}) + ${staffCount} staff (@ ${inr(staffRate)})</div>
      </div>
      <div style="padding: 12px 14px; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;">
        <div style="color: var(--text-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase;">Hardware &amp; Warehouse</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${inr(terminalsCost + warehouseCost)}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${terminalsCount} terminals + ${warehouseCount} warehouse</div>
      </div>
      <div style="padding: 12px 14px; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;">
        <div style="color: var(--text-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase;">Patient Volume Usage</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${inr(admCost)}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${admCount} admissions (@ ${inr(admRate)}/adm)</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #F1F5F9; border-radius: 8px; font-size: 13px;">
      <div style="color: var(--text-secondary);">
        Subtotal: <strong style="color: var(--text-primary);">${inr(subtotal)}</strong> &nbsp;·&nbsp; GST (18%): <strong style="color: var(--text-primary);">${inr(gst)}</strong>
      </div>
      <div style="font-size: 15px; font-weight: 700; color: var(--primary, #0D9488);">
        Total Monthly Cloud Charge: <span style="font-size: 18px; font-weight: 800;">${inr(totalMonthly)}</span>
      </div>
    </div>
  `;
}

function renderWardOccupancy(wards, beds) {
  const container = document.getElementById('ward-occupancy-list');
  if (!wards.length) {
    container.innerHTML = '<div class="md-empty-state"><span>No wards configured.</span></div>';
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
            <span style="color: var(--text-secondary);">${occupied}/${wardBeds.length} beds (${pct}%)</span>
          </div>
          <div class="progress-bar-bg" style="height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; border-radius: 999px; background: ${pct >= 90 ? 'var(--error, #EF4444)' : pct >= 70 ? 'var(--warning, #F59E0B)' : 'var(--success, #10B981)'};"></div>
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
        <td style="font-weight: 600;">${window.Formatters.escapeHtml(status)}</td>
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
    container.innerHTML = '<div class="md-empty-state"><span>All items above reorder level.</span></div>';
    return;
  }

  container.innerHTML = lowStock
    .map(
      (item) => `
      <div class="alert-card" style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-base); padding: 12px; margin-bottom: 12px;">
        <p style="font-size: 14px; font-weight: 500; color: var(--error-text, #991B1B); margin: 0 0 4px 0;">${window.Formatters.escapeHtml(item.item_name)}</p>
        <p style="font-size: 12px; color: var(--error-text, #991B1B); margin: 0;">Stock: ${item.stock_quantity} (Reorder Level: ${item.reorder_level})</p>
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
    container.innerHTML = '<div class="md-empty-state"><span>No staff accounts registered.</span></div>';
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
