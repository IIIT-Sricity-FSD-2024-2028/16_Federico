'use strict';

const organizationService = require('./organization.service');

describe('services/organization.service', () => {
  it('create() assigns an incrementing id and a unique slug', () => {
    const first = organizationService.create({ name: 'Unit Test Hospital A' });
    const second = organizationService.create({ name: 'Unit Test Hospital A' }); // same name -> slug must still be unique
    expect(second.organization_id).toBe(first.organization_id + 1);
    expect(second.slug).not.toBe(first.slug);
    expect(first.status).toBe('ACTIVE');
  });

  it('setStatus()/remove() transition status without deleting the record (soft delete)', () => {
    const org = organizationService.create({ name: 'Unit Test Hospital B' });
    organizationService.setStatus(org.organization_id, 'SUSPENDED');
    expect(organizationService.findById(org.organization_id).status).toBe(
      'SUSPENDED',
    );

    organizationService.remove(org.organization_id);
    const afterDelete = organizationService.findById(org.organization_id);
    expect(afterDelete).not.toBeNull();
    expect(afterDelete.status).toBe('DELETED');
  });

  it('createHospital() marks the first branch primary automatically', () => {
    const org = organizationService.create({ name: 'Unit Test Hospital C' });
    const first = organizationService.createHospital(org.organization_id, {
      name: 'Main Campus',
    });
    const second = organizationService.createHospital(org.organization_id, {
      name: 'Second Branch',
    });

    expect(first.is_primary).toBe(true);
    expect(second.is_primary).toBe(false);
    expect(
      organizationService.primaryHospitalFor(org.organization_id).hospital_id,
    ).toBe(first.hospital_id);
    expect(organizationService.hospitalsFor(org.organization_id)).toHaveLength(
      2,
    );
  });

  it('setResourceQuantities()/resourceQuantitiesFor() round-trip and store capacity limits', () => {
    const org = organizationService.create({ name: 'Unit Test Hospital D' });
    expect(organizationService.resourceQuantitiesFor(org.organization_id)).toEqual({});

    organizationService.setResourceQuantities(org.organization_id, {
      ADMISSIONS: { GENERAL_BEDS: 50, ICU_BEDS: 10 },
      BILLING: { BILLING_TERMINALS: 5 },
    });
    const stored = organizationService.resourceQuantitiesFor(org.organization_id);
    expect(stored.ADMISSIONS.GENERAL_BEDS).toBe(50);
    expect(stored.ADMISSIONS.ICU_BEDS).toBe(10);
    expect(stored.BILLING.BILLING_TERMINALS).toBe(5);

    const catalog = organizationService.resourceCatalogFor(org.organization_id);
    expect(catalog.length).toBeGreaterThan(0);
    const genBed = catalog.find((r) => r.resource_code === 'GENERAL_BEDS');
    expect(genBed.quantity).toBe(50);
  });

  it('marketplaceListing() only includes ACTIVE organizations and never leaks internal fields', () => {
    const active = organizationService.create({ name: 'Unit Test Hospital E' });
    const suspended = organizationService.create({
      name: 'Unit Test Hospital F',
    });
    organizationService.setStatus(suspended.organization_id, 'SUSPENDED');

    const listing = organizationService.marketplaceListing();
    const ids = listing.map((o) => o.organization_id);
    expect(ids).toContain(active.organization_id);
    expect(ids).not.toContain(suspended.organization_id);
    listing.forEach((entry) => {
      expect(entry.status).toBeUndefined();
    });
  });

  it('usageFor() counts records scoped to the organization only', () => {
    const orgA = organizationService.create({ name: 'Unit Test Hospital G' });
    const orgB = organizationService.create({ name: 'Unit Test Hospital H' });
    organizationService.createHospital(orgA.organization_id, {
      name: 'A Campus',
    });
    organizationService.createHospital(orgB.organization_id, {
      name: 'B Campus',
    });

    const usageA = organizationService.usageFor(orgA.organization_id);
    expect(usageA.hospitals).toBe(1);
  });
});
