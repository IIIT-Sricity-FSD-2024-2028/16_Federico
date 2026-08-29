'use strict';

const { EventEmitter } = require('events');
const { meter } = require('./meter');
const metrics = require('./metrics.service');
const dataStore = require('../store/dataStore');

// A dedicated high org id so counters never collide with other specs.
const ORG = 991001;

function fakeRes(statusCode) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  return res;
}

function run(method, statusCode, tenant) {
  const handler = meter('BILLING');
  const req = { method, tenant };
  const res = fakeRes(statusCode);
  const next = jest.fn();
  handler(req, res, next);
  expect(next).toHaveBeenCalledTimes(1); // never blocks
  res.emit('finish');
  return res;
}

describe('meter(moduleCode) — per-hit billing hook', () => {
  beforeEach(() => {
    if (dataStore.moduleUsage) delete dataStore.moduleUsage[String(ORG)];
  });

  it('returns an arity-3 Express handler', () => {
    const h = meter('BILLING');
    expect(typeof h).toBe('function');
    expect(h.length).toBe(3);
  });

  it('counts one successful non-GET request for a tenant org', () => {
    run('POST', 201, { organizationId: ORG });
    expect(metrics.hitsFor(ORG, 'BILLING')).toBe(1);
    const bucket =
      dataStore.moduleUsage[String(ORG)].BILLING[metrics.period()];
    expect(bucket.by_method.POST).toBe(1);
    expect(bucket.first_hit_at).toBeTruthy();
  });

  it('accumulates across requests and tracks method breakdown', () => {
    run('POST', 201, { organizationId: ORG });
    run('POST', 200, { organizationId: ORG });
    run('PUT', 200, { organizationId: ORG });
    expect(metrics.hitsFor(ORG, 'BILLING')).toBe(3);
    const bucket =
      dataStore.moduleUsage[String(ORG)].BILLING[metrics.period()];
    expect(bucket.by_method).toEqual({ POST: 2, PUT: 1 });
  });

  it('never counts GET / reads', () => {
    run('GET', 200, { organizationId: ORG });
    expect(dataStore.moduleUsage[String(ORG)]).toBeUndefined();
  });

  it('never counts a 4xx/5xx response (e.g. a requireModule 403)', () => {
    run('POST', 403, { organizationId: ORG });
    run('DELETE', 500, { organizationId: ORG });
    expect(dataStore.moduleUsage[String(ORG)]).toBeUndefined();
  });

  it('skips platform users / requests with no tenant org', () => {
    run('POST', 201, { organizationId: null });
    run('POST', 201, undefined);
    expect(dataStore.moduleUsage[String(ORG)]).toBeUndefined();
  });
});
