'use strict';

const wardService = require('./ward.service');

describe('services/ward.service', () => {
  function makeWard(overrides) {
    const ward = wardService.createWard({
      ward_name: 'Unit Test Ward',
      total_beds: 2,
      organization_id: 999,
      hospital_id: 999,
      ...overrides,
    });
    for (let i = 1; i <= ward.total_beds; i++) {
      wardService.createBed({
        ward_id: ward.ward_id,
        bed_number: `UTW-0${i}`,
        status: 'AVAILABLE',
        organization_id: 999,
        hospital_id: 999,
      });
    }
    return ward;
  }

  it('updateWard() grows a ward by creating new AVAILABLE beds', () => {
    const ward = makeWard();
    const result = wardService.updateWard(ward.ward_id, { total_beds: 4 });
    expect(result.total_beds).toBe(4);
    expect(wardService.findBedsByWard(ward.ward_id).length).toBe(4);
  });

  it('updateWard() shrinks a ward by removing only AVAILABLE beds', () => {
    const ward = makeWard({ total_beds: 3 });
    const beds = wardService.findBedsByWard(ward.ward_id);
    wardService.updateBedStatus(beds[0].bed_id, 'OCCUPIED');

    const result = wardService.updateWard(ward.ward_id, { total_beds: 1 });
    expect(result.total_beds).toBe(1);
    const remaining = wardService.findBedsByWard(ward.ward_id);
    expect(remaining.length).toBe(1);
    expect(remaining[0].status).toBe('OCCUPIED');
  });

  it('updateWard() refuses to shrink below the currently occupied bed count', () => {
    const ward = makeWard({ total_beds: 2 });
    const beds = wardService.findBedsByWard(ward.ward_id);
    wardService.updateBedStatus(beds[0].bed_id, 'OCCUPIED');
    wardService.updateBedStatus(beds[1].bed_id, 'OCCUPIED');

    const result = wardService.updateWard(ward.ward_id, { total_beds: 1 });
    expect(result.error).toBe('BEDS_OCCUPIED');
    expect(wardService.findBedsByWard(ward.ward_id).length).toBe(2);
  });

  it('deleteWard() removes an empty ward and its beds', () => {
    const ward = makeWard();
    const result = wardService.deleteWard(ward.ward_id);
    expect(result.deleted).toBe(true);
    expect(wardService.findAllWards().some((w) => w.ward_id === ward.ward_id)).toBe(false);
    expect(wardService.findBedsByWard(ward.ward_id).length).toBe(0);
  });

  it('deleteWard() refuses to delete a ward with an occupied bed', () => {
    const ward = makeWard();
    const beds = wardService.findBedsByWard(ward.ward_id);
    wardService.updateBedStatus(beds[0].bed_id, 'OCCUPIED');

    const result = wardService.deleteWard(ward.ward_id);
    expect(result.error).toBe('WARD_HAS_OCCUPIED_BEDS');
    expect(wardService.findAllWards().some((w) => w.ward_id === ward.ward_id)).toBe(true);
  });
});
