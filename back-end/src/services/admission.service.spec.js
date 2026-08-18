'use strict';

const admissionService = require('./admission.service');

describe('services/admission.service', () => {
  it('create() defaults admit_time to now when not supplied, but respects an explicit one', () => {
    const withoutTime = admissionService.create({ patient_id: 201, bed_id: 1, status: 'ADMITTED', organization_id: 1, hospital_id: 1 });
    expect(withoutTime.admit_time).toBeTruthy();

    const explicitTime = admissionService.create({ patient_id: 201, bed_id: 1, status: 'ADMITTED', admit_time: '2026-01-01T00:00:00.000Z', organization_id: 1, hospital_id: 1 });
    expect(explicitTime.admit_time).toBe('2026-01-01T00:00:00.000Z');
  });

  it('findOne()/update() round-trip and return null for an unknown id', () => {
    const admission = admissionService.create({ patient_id: 201, bed_id: 1, status: 'ADMITTED', organization_id: 1, hospital_id: 1 });
    expect(admissionService.findOne(admission.admission_id)).toEqual(admission);
    expect(admissionService.findOne(999999)).toBeNull();

    const updated = admissionService.update(admission.admission_id, { status: 'DISCHARGED' });
    expect(updated.status).toBe('DISCHARGED');
    expect(admissionService.update(999999, { status: 'X' })).toBeNull();
  });

  it('every created admission ends up in findAll()', () => {
    const before = admissionService.findAll().length;
    admissionService.create({ patient_id: 201, bed_id: 1, status: 'ADMITTED', organization_id: 1, hospital_id: 1 });
    expect(admissionService.findAll().length).toBe(before + 1);
  });
});
