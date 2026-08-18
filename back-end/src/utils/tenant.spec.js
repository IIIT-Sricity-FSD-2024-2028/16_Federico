'use strict';

const { withTenant, scopeToOrg, belongsToOrg, MODULE_CODES } = require('./tenant');

describe('utils/tenant', () => {
  describe('withTenant', () => {
    it('stamps organization_id/hospital_id from req.tenant onto a payload', () => {
      const req = { tenant: { organizationId: 5, hospitalId: 9 } };
      const result = withTenant(req, { name: 'X' });
      expect(result).toEqual({ name: 'X', organization_id: 5, hospital_id: 9 });
    });

    it('lets an explicit hospital_id in the payload win over the session default', () => {
      const req = { tenant: { organizationId: 5, hospitalId: 9 } };
      const result = withTenant(req, { name: 'X', hospital_id: 42 });
      expect(result.hospital_id).toBe(42);
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
  });

  describe('belongsToOrg', () => {
    it('is true only for a record matching the caller organization', () => {
      const req = { tenant: { organizationId: 1 } };
      expect(belongsToOrg({ organization_id: 1 }, req)).toBe(true);
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
