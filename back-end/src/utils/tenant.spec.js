'use strict';

const {
  withTenant,
  scopeToOrg,
  belongsToOrg,
  MODULE_CODES,
} = require('./tenant');

describe('utils/tenant', () => {
  describe('withTenant', () => {
    it('stamps organization_id/hospital_id from req.tenant onto a payload', () => {
      const req = { tenant: { organizationId: 5, hospitalId: 9 } };
      const result = withTenant(req, { name: 'X' });
      expect(result).toEqual({ name: 'X', organization_id: 5, hospital_id: 9 });
    });

    it('does not allow a payload to override the session hospital', () => {
      const req = { tenant: { organizationId: 5, hospitalId: 9 } };
      const result = withTenant(req, { name: 'X', hospital_id: 42 });
      expect(result.hospital_id).toBe(9);
    });

    it('stamps null when there is no tenant at all', () => {
      const result = withTenant({}, { name: 'X' });
      expect(result.organization_id).toBeNull();
      expect(result.hospital_id).toBeNull();
    });
  });

  describe('scopeToOrg', () => {
    const list = [
      { id: 1, organization_id: 1 },
      { id: 2, organization_id: 2 },
      { id: 3, organization_id: 1 },
    ];

    it('filters to only the caller organization', () => {
      const req = { tenant: { organizationId: 1 } };
      expect(scopeToOrg(list, req).map((r) => r.id)).toEqual([1, 3]);
    });

    it('fails closed (empty list) when there is no organization on the tenant', () => {
      expect(scopeToOrg(list, { tenant: {} })).toEqual([]);
      expect(scopeToOrg(list, {})).toEqual([]);
    });

    it('keeps records from other hospitals in the same organization out of a hospital-scoped list', () => {
      const hospitalList = [
        { id: 1, organization_id: 1, hospital_id: 9 },
        { id: 2, organization_id: 1, hospital_id: 10 },
        { id: 3, organization_id: 1, hospital_id: null },
      ];
      expect(scopeToOrg(hospitalList, { tenant: { organizationId: 1, hospitalId: 9 } }).map((record) => record.id)).toEqual([1, 3]);
    });
  });

  describe('belongsToOrg', () => {
    it('is true only for a record matching the caller organization', () => {
      const req = { tenant: { organizationId: 1 } };
      expect(belongsToOrg({ organization_id: 1 }, req)).toBe(true);
      expect(belongsToOrg({ organization_id: '1' }, req)).toBe(true);
      expect(belongsToOrg({ organization_id: 1, hospital_id: '9' }, { tenant: { organizationId: 1, hospitalId: 9 } })).toBe(true);
      expect(belongsToOrg({ organization_id: 1, hospital_id: 10 }, { tenant: { organizationId: 1, hospitalId: 9 } })).toBe(false);
      expect(belongsToOrg({ organization_id: 2 }, req)).toBe(false);
    });

    it('is false for a null/undefined record', () => {
      const req = { tenant: { organizationId: 1 } };
      expect(belongsToOrg(null, req)).toBe(false);
      expect(belongsToOrg(undefined, req)).toBe(false);
    });
  });

  it('MODULE_CODES is a fixed, non-empty list of module code strings', () => {
    expect(MODULE_CODES.length).toBeGreaterThan(0);
    MODULE_CODES.forEach((code) => expect(typeof code).toBe('string'));
  });
});
