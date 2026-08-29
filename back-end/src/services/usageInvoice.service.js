'use strict';

/**
 * Closed billing-period snapshots for the usage-based ("per-hit platform fee")
 * revenue model.
 *
 * There is no cron/job runner in this codebase, so a Platform Super User closes
 * a period manually via `POST /platform/billing/close-period`. Closing is
 * idempotent: re-closing the same period REPLACES that org's row, so a period
 * can be re-priced safely. Closing never resets `moduleUsage` — the next month
 * accrues under a fresh YYYY-MM key.
 */

const dataStore = require('../store/dataStore');
const persist = require('../store/persist');
const metrics = require('../metering/metrics.service');
const serviceCatalog = require('../config/serviceCatalog');
const organizationService = require('./organization.service');
const platformActivityService = require('./platformActivity.service');

function nextInvoiceId() {
  const rows = dataStore.usageInvoices || [];
  return rows.length > 0 ? Math.max(...rows.map((r) => Number(r.invoice_id) || 0)) + 1 : 1;
}

/** Build (but do not store) the invoice row for one org + period. */
function buildRow(org, per) {
  const oid = org.organization_id;
  const branches = organizationService.hospitalsFor(oid).length;
  const enabled = organizationService.enabledModulesFor(oid);
  const instances = organizationService.moduleInstancesFor(oid);

  const hitMap = metrics.hitMap(oid, enabled, per);
  const usage = serviceCatalog.computeUsageFee(hitMap);
  const baseFee = serviceCatalog.computeBaseFee(branches);

  const flatMods = enabled.filter((c) => serviceCatalog.FLAT_MODULES.includes(c));
  const flatCost = serviceCatalog.computeCost(
    Object.fromEntries(flatMods.map((c) => [c, instances[c] || branches || 1])),
  );

  const hitSnapshot = {};
  Object.keys(hitMap).forEach((code) => {
    hitSnapshot[code] = hitMap[code];
  });

  return {
    organization_id: oid,
    organization_name: org.name,
    period: per,
    currency: 'INR',
    branches,
    base_fee: baseFee,
    insurance_flat_fee: flatCost.total,
    insurance_flat_lines: flatCost.lines,
    usage_lines: usage.lines,
    usage_fee_total: usage.total,
    total_amount: baseFee + flatCost.total + usage.total,
    hit_snapshot: hitSnapshot,
  };
}

/**
 * Close (snapshot) a billing period for every ACTIVE organization.
 *
 * @param {string} per  'YYYY-MM' (default: current UTC month)
 * @param {{ actorId?: number, finalize?: boolean }} [opts]  finalize=false -> DRAFT
 * @returns {{ period: string, finalized: boolean, invoices: Array }}
 */
function closePeriod(per, opts = {}) {
  const period = per && /^\d{4}-\d{2}$/.test(per) ? per : metrics.period();
  const finalize = opts.finalize !== false;
  const now = new Date().toISOString();

  if (!Array.isArray(dataStore.usageInvoices)) dataStore.usageInvoices = [];

  const activeOrgs = organizationService
    .findAll()
    .filter((o) => o.status === 'ACTIVE');

  const written = [];
  activeOrgs.forEach((org) => {
    const row = buildRow(org, period);
    // Skip orgs with nothing to bill at all (no base, no flat, no usage).
    if (row.total_amount === 0 && row.usage_fee_total === 0) return;

    const idx = dataStore.usageInvoices.findIndex(
      (r) => r.organization_id === org.organization_id && r.period === period,
    );
    const existing = idx >= 0 ? dataStore.usageInvoices[idx] : null;
    const finalRow = {
      invoice_id: existing ? existing.invoice_id : nextInvoiceId(),
      ...row,
      status: finalize ? 'CLOSED' : 'DRAFT',
      generated_at: now,
      generated_by: opts.actorId ? Number(opts.actorId) : null,
    };
    if (idx >= 0) dataStore.usageInvoices[idx] = finalRow;
    else dataStore.usageInvoices.push(finalRow);
    written.push(finalRow);
  });

  platformActivityService.log(
    opts.actorId,
    'CLOSE_BILLING_PERIOD',
    null,
    `Closed ${period} — ${written.length} invoice(s), ₹${written.reduce(
      (s, r) => s + r.usage_fee_total,
      0,
    )} usage fees${finalize ? '' : ' (draft)'}`,
  );

  persist.save();
  return { period, finalized: finalize, invoices: written };
}

function listInvoices(filter = {}) {
  let rows = dataStore.usageInvoices || [];
  if (filter.organization_id) {
    const oid = Number(filter.organization_id);
    rows = rows.filter((r) => r.organization_id === oid);
  }
  if (filter.period) {
    rows = rows.filter((r) => r.period === filter.period);
  }
  return rows;
}

module.exports = { closePeriod, listInvoices, buildRow };
