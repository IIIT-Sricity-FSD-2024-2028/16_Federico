'use strict';

const metrics = require('../metering/metrics.service');
const organizationService = require('../services/organization.service');
const usageInvoiceService = require('../services/usageInvoice.service');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('📈 Metering');

function resolvePeriod(req) {
  const q = req.query && req.query.period;
  return q && /^\d{4}-\d{2}$/.test(q) ? q : metrics.period();
}

/** Full billing view for one org + period: base + INSURANCE flat + metered usage. */
function orgView(organizationId, per) {
  const org = organizationService.findById(Number(organizationId));
  if (!org) return null;
  const row = usageInvoiceService.buildRow(org, per);
  const rollup = metrics.usageForOrg(organizationId, per);
  return {
    organization_id: org.organization_id,
    organization_name: org.name,
    period: per,
    branches: row.branches,
    total_billable_hits: rollup.total_hits,
    modules: rollup.modules, // { CODE: { billable_hits, by_method } }
    base_fee: row.base_fee,
    insurance_flat_fee: row.insurance_flat_fee,
    fee_lines: row.usage_lines,
    usage_fee_total: row.usage_fee_total,
    total_monthly: row.total_amount,
  };
}

// GET /platform/usage/metered?period=YYYY-MM
function platformMeteredUsage(req, res) {
  const per = resolvePeriod(req);
  const agg = metrics.aggregatePlatform(per);

  const usageByModule = {};
  let totalUsageFee = 0;
  organizationService
    .findAll()
    .filter((o) => o.status === 'ACTIVE')
    .forEach((o) => {
      const view = orgView(o.organization_id, per);
      if (!view) return;
      totalUsageFee += view.usage_fee_total;
      view.fee_lines.forEach((l) => {
        const b =
          usageByModule[l.code] ||
          (usageByModule[l.code] = {
            code: l.code,
            name: l.name,
            billable_hits: 0,
            usage_fee: 0,
          });
        b.billable_hits += l.billable_hits;
        b.usage_fee += l.amount;
      });
    });

  sendResult(res, {
    billing_period: per,
    total_billable_hits: agg.total_hits,
    total_usage_fee: totalUsageFee,
    hits_by_module: agg.hits_by_module,
    usage_by_module: usageByModule,
    by_org: agg.by_org,
  });
}

// GET /platform/organizations/:id/usage/metered?period=YYYY-MM
function orgMeteredUsage(req, res) {
  const view = orgView(+req.params.id, resolvePeriod(req));
  sendResult(res, view, view ? 200 : 404);
}

// POST /platform/billing/close-period  { period?, finalize? }
function closeBillingPeriod(req, res) {
  const result = usageInvoiceService.closePeriod(req.body && req.body.period, {
    actorId: req.session && req.session.userId,
    finalize: req.body ? req.body.finalize !== false : true,
  });
  logger.log(
    `🧾 CLOSE PERIOD  period=${result.period}  invoices=${result.invoices.length}  finalized=${result.finalized}`,
  );
  sendResult(res, result, 200);
}

// GET /platform/billing/invoices?org=&period=
function listInvoices(req, res) {
  sendResult(
    res,
    usageInvoiceService.listInvoices({
      organization_id: req.query.org,
      period: req.query.period,
    }),
  );
}

// GET /account/usage  (tenant-facing — "what will I be billed this month")
function myUsage(req, res) {
  const orgId = req.tenant && req.tenant.organizationId;
  if (!orgId) return sendResult(res, null, 403);
  sendResult(res, orgView(orgId, resolvePeriod(req)));
}

module.exports = {
  platformMeteredUsage,
  orgMeteredUsage,
  closeBillingPeriod,
  listInvoices,
  myUsage,
};
