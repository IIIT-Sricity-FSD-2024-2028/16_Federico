'use strict';

/**
 * Usage metering store access — the only module that reads/writes
 * `dataStore.moduleUsage`.
 *
 * Shape:
 *   moduleUsage[organizationId][MODULE_CODE][YYYY-MM] = {
 *     billable_hits, by_method: { POST, PUT, PATCH, DELETE, ... },
 *     first_hit_at, last_hit_at
 *   }
 *
 * Every read is zero-safe: a missing org / module / period reads as 0 and never
 * throws, so callers (organization.service#usageFor, platform dashboards) work
 * unchanged for orgs that have no usage yet.
 *
 * Requires only dataStore + persist + utils/tenant — no dependency on
 * organization.service, so there is no require cycle.
 */

const dataStore = require('../store/dataStore');
const persist = require('../store/persist');
const { MODULE_CODES } = require('../utils/tenant');

/** 'YYYY-MM' in UTC for the given date (default: now). */
function period(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function orgKey(organizationId) {
  return String(Number(organizationId));
}

/** Lazily create and return moduleUsage[org][code][per]. */
function ensureBucket(organizationId, moduleCode, per) {
  if (!dataStore.moduleUsage || typeof dataStore.moduleUsage !== 'object') {
    dataStore.moduleUsage = {};
  }
  const ok = orgKey(organizationId);
  const code = String(moduleCode).toUpperCase();
  const org = dataStore.moduleUsage[ok] || (dataStore.moduleUsage[ok] = {});
  const mod = org[code] || (org[code] = {});
  return (
    mod[per] ||
    (mod[per] = {
      billable_hits: 0,
      by_method: {},
      first_hit_at: null,
      last_hit_at: null,
    })
  );
}

/**
 * Record one billable hit. Called from meter.js on response `finish`.
 * Triggers a debounced persist itself (persistOnMutation flushes BEFORE this
 * runs for the same request, so the counter would otherwise only reach disk on
 * the next mutation).
 */
function increment(organizationId, moduleCode, method, date = new Date()) {
  const per = period(date);
  const bucket = ensureBucket(organizationId, moduleCode, per);
  const m = String(method || 'OTHER').toUpperCase();

  bucket.billable_hits += 1;
  bucket.by_method[m] = (bucket.by_method[m] || 0) + 1;

  const nowIso = (date instanceof Date ? date : new Date(date)).toISOString();
  if (!bucket.first_hit_at) bucket.first_hit_at = nowIso;
  bucket.last_hit_at = nowIso;

  persist.save();
  return bucket;
}

/** Billable hits for one org + module + period. Zero-safe. */
function hitsFor(organizationId, moduleCode, per = period()) {
  const org = (dataStore.moduleUsage || {})[orgKey(organizationId)];
  if (!org) return 0;
  const mod = org[String(moduleCode).toUpperCase()];
  if (!mod || !mod[per]) return 0;
  return Number(mod[per].billable_hits) || 0;
}

/**
 * { CODE: billable_hits } for the intersection of `enabledCodes` and the
 * metered modules, for the given period. Modules with zero hits are still
 * included (value 0) so the fee breakdown lists every enabled metered module.
 */
function hitMap(organizationId, enabledCodes, per = period()) {
  const serviceCatalog = require('../config/serviceCatalog');
  const enabled = new Set((enabledCodes || []).map((c) => String(c).toUpperCase()));
  const out = {};
  serviceCatalog.METERED_MODULES.forEach((code) => {
    if (enabled.has(code)) out[code] = hitsFor(organizationId, code, per);
  });
  return out;
}

/**
 * Per-org rollup for a period:
 *   { period, modules: { CODE: { billable_hits, by_method } }, total_hits }
 */
function usageForOrg(organizationId, per = period()) {
  const org = (dataStore.moduleUsage || {})[orgKey(organizationId)] || {};
  const modules = {};
  let total = 0;
  Object.keys(org).forEach((code) => {
    const bucket = org[code] && org[code][per];
    if (!bucket) return;
    const hits = Number(bucket.billable_hits) || 0;
    modules[code] = { billable_hits: hits, by_method: bucket.by_method || {} };
    total += hits;
  });
  return { period: per, modules, total_hits: total };
}

/**
 * Platform-wide rollup for a period:
 *   { period, total_hits, hits_by_module: { CODE: n }, by_org: { orgId: { total_hits, modules } } }
 */
function aggregatePlatform(per = period()) {
  const all = dataStore.moduleUsage || {};
  const hitsByModule = {};
  const byOrg = {};
  let total = 0;
  Object.keys(all).forEach((ok) => {
    const rollup = usageForOrg(ok, per);
    if (rollup.total_hits === 0 && Object.keys(rollup.modules).length === 0) return;
    byOrg[ok] = { total_hits: rollup.total_hits, modules: rollup.modules };
    total += rollup.total_hits;
    Object.keys(rollup.modules).forEach((code) => {
      hitsByModule[code] = (hitsByModule[code] || 0) + rollup.modules[code].billable_hits;
    });
  });
  return { period: per, total_hits: total, hits_by_module: hitsByModule, by_org: byOrg };
}

module.exports = {
  period,
  increment,
  hitsFor,
  hitMap,
  usageForOrg,
  aggregatePlatform,
  // exported for tests / future pruning
  ensureBucket,
  MODULE_CODES,
};
