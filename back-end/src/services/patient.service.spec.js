'use strict';

const patientService = require('./patient.service');
const dataStore = require('../store/dataStore');

describe('services/patient.service', () => {
  let samplePatient;
  let snapshot;

  beforeAll(() => {
    snapshot = {};
    for (const [k, v] of Object.entries(dataStore)) {
      if (Array.isArray(v)) {
        snapshot[k] = JSON.parse(JSON.stringify(v));
      }
    }

    samplePatient = patientService.create({
      name: '  Test Patient Unit  ',
      email: '  TEST.UNIT@example.com  ',
      phone: '  +919876543210  ',
      dob: '1990-05-20',
      gender: 'Male',
      blood_group: ' O+ ',
      address: ' 123 Healthcare Ave ',
      organization_id: 1,
      hospital_id: 1,
    });
  });

  afterAll(() => {
    if (snapshot) {
      for (const [k, v] of Object.entries(snapshot)) {
        if (Array.isArray(dataStore[k])) {
          dataStore[k].length = 0;
          dataStore[k].push(...v);
        }
      }
    }
  });

  describe('findAll', () => {
    it('returns the active patients array from dataStore', () => {
      const list = patientService.findAll();
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((p) => p.patient_id === samplePatient.patient_id)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('finds a patient by numeric patient_id', () => {
      const found = patientService.findOne(samplePatient.patient_id);
      expect(found).not.toBeNull();
      expect(found.patient_id).toBe(samplePatient.patient_id);
    });

    it('finds a patient by numeric string patient_id', () => {
      const found = patientService.findOne(String(samplePatient.patient_id));
      expect(found).not.toBeNull();
      expect(found.patient_id).toBe(samplePatient.patient_id);
    });

    it('finds a patient by case-insensitive UHID', () => {
      const found = patientService.findOne(samplePatient.uhid.toLowerCase());
      expect(found).not.toBeNull();
      expect(found.patient_id).toBe(samplePatient.patient_id);
    });

    it('returns null for unknown id or null/undefined parameter', () => {
      expect(patientService.findOne(null)).toBeNull();
      expect(patientService.findOne(undefined)).toBeNull();
      expect(patientService.findOne(9999999)).toBeNull();
      expect(patientService.findOne('UHID-NONEXISTENT')).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('finds patient linked to user_id', () => {
      const patientWithUser = patientService.create({
        name: 'Linked User Patient',
        user_id: 9876,
        phone: '+919999999999',
        dob: '1985-01-01',
        gender: 'Female',
        organization_id: 1,
      });

      const found = patientService.findByUserId(9876);
      expect(found).not.toBeNull();
      expect(found.patient_id).toBe(patientWithUser.patient_id);
      expect(patientService.findByUserId(String(9876))).not.toBeNull();
    });

    it('returns null for non-existent user_id or null/undefined', () => {
      expect(patientService.findByUserId(null)).toBeNull();
      expect(patientService.findByUserId(undefined)).toBeNull();
      expect(patientService.findByUserId(543210987)).toBeNull();
    });
  });

  describe('create', () => {
    it('assigns auto-incrementing patient_id, trims strings, and generates UHID when omitted', () => {
      const created = patientService.create({
        name: '  Jane Doe  ',
        email: '  Jane.Doe@Hospital.Org  ',
        phone: '  +919123456789  ',
        dob: '1992-03-15',
        gender: 'Female',
        blood_group: ' A+ ',
        organization_id: 1,
      });

      expect(created.patient_id).toBeGreaterThan(200);
      expect(created.name).toBe('Jane Doe');
      expect(created.email).toBe('jane.doe@hospital.org');
      expect(created.phone).toBe('+919123456789');
      expect(created.blood_group).toBe('A+');
      expect(created.uhid).toMatch(/^UHID-[0-9A-Z]{6}$/);
      expect(created.created_at).toBeDefined();
    });

    it('respects an explicit UHID if provided', () => {
      const created = patientService.create({
        name: 'Explicit UHID Patient',
        uhid: 'UHID-CUSTOM-99',
        dob: '1990-01-01',
        gender: 'Male',
        organization_id: 1,
      });
      expect(created.uhid).toBe('UHID-CUSTOM-99');
    });

    it('synthesizes full name when first_name and last_name (or firstName/lastName) are passed', () => {
      const createdWithSnake = patientService.create({
        first_name: 'Rahul',
        last_name: 'Dravid',
        dob: '1975-01-11',
        gender: 'Male',
        organization_id: 1,
      });
      expect(createdWithSnake.name).toBe('Rahul Dravid');

      const createdWithCamel = patientService.create({
        firstName: 'Sourav',
        lastName: 'Ganguly',
        dob: '1972-07-08',
        gender: 'Male',
        organization_id: 1,
      });
      expect(createdWithCamel.name).toBe('Sourav Ganguly');
    });
  });

  describe('update', () => {
    it('updates allowed attributes and trims string input', () => {
      const patient = patientService.create({
        name: 'Original Patient',
        phone: '+919876500000',
        dob: '1990-01-01',
        gender: 'Male',
        organization_id: 1,
      });

      const updated = patientService.update(patient.patient_id, {
        name: '  Updated Name  ',
        phone: '  +919876500001  ',
        address: '  New Address  ',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.phone).toBe('+919876500001');
      expect(updated.address).toBe('New Address');

      const updatedWithFirstLast = patientService.update(patient.patient_id, {
        first_name: 'Anil',
        last_name: 'Kumble',
      });
      expect(updatedWithFirstLast.name).toBe('Anil Kumble');
    });

    it('protects immutable keys (patient_id, organization_id, uhid) from mutation', () => {
      const patient = patientService.create({
        name: 'Protected Key Patient',
        uhid: 'UHID-ORIGINAL',
        organization_id: 1,
      });

      const updated = patientService.update(patient.patient_id, {
        patient_id: 99999,
        organization_id: 88888,
        uhid: 'UHID-FORGED',
        name: 'Valid Name Change',
      });

      expect(updated.patient_id).toBe(patient.patient_id);
      expect(updated.organization_id).toBe(1);
      expect(updated.uhid).toBe('UHID-ORIGINAL');
      expect(updated.name).toBe('Valid Name Change');
    });

    it('returns null when updating non-existent patient', () => {
      expect(patientService.update(9999999, { name: 'Nobody' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('throws 409 Conflict if patient has an active admission', () => {
      // Find patient with active admission
      const admitted = dataStore.admissions.find((a) => a.status === 'ADMITTED');
      expect(admitted).toBeDefined();

      expect(() => {
        patientService.remove(admitted.patient_id);
      }).toThrow(/Cannot delete patient/);
    });

    it('successfully deletes a patient who has no active admission', () => {
      const tempPatient = patientService.create({
        name: 'Deletable Patient',
        phone: '+919000000000',
        dob: '1990-01-01',
        gender: 'Male',
        organization_id: 1,
      });

      const res = patientService.remove(tempPatient.patient_id);
      expect(res.deleted).toBe(true);
      expect(patientService.findOne(tempPatient.patient_id)).toBeNull();
    });

    it('returns { deleted: false } for non-existent patient', () => {
      expect(patientService.remove(9999999)).toEqual({ deleted: false });
    });
  });

  describe('Insurance Operations', () => {
    it('findAllInsurances returns all insurance policies', () => {
      const insurances = patientService.findAllInsurances();
      expect(Array.isArray(insurances)).toBe(true);
    });

    it('findInsuranceByPatient filters records by numeric patient_id', () => {
      const created = patientService.createInsurance({
        patient_id: samplePatient.patient_id,
        provider_name: 'Test Shield',
        policy_number: 'POL-111',
        organization_id: 1,
      });

      const list = patientService.findInsuranceByPatient(samplePatient.patient_id);
      expect(list.some((i) => i.insurance_id === created.insurance_id)).toBe(true);
      expect(patientService.findInsuranceByPatient(String(samplePatient.patient_id)).length).toBe(list.length);
    });

    it('findCurrentInsurance returns the newest policy with highest insurance_id', () => {
      patientService.createInsurance({
        patient_id: samplePatient.patient_id,
        provider_name: 'Old Insurance',
        policy_number: 'POL-OLD',
        organization_id: 1,
      });

      const ins2 = patientService.createInsurance({
        patient_id: samplePatient.patient_id,
        provider_name: 'Latest Insurance',
        policy_number: 'POL-NEW',
        organization_id: 1,
      });

      const current = patientService.findCurrentInsurance(samplePatient.patient_id);
      expect(current).not.toBeNull();
      expect(current.insurance_id).toBe(ins2.insurance_id);
      expect(current.provider_name).toBe('Latest Insurance');
    });

    it('findCurrentInsurance returns null if patient has no insurance records', () => {
      expect(patientService.findCurrentInsurance(8888888)).toBeNull();
    });

    it('createInsurance defaults coverage_type to Comprehensive and calculates 1-year window', () => {
      const ins = patientService.createInsurance({
        patient_id: samplePatient.patient_id,
        provider_name: '  Max Bupa  ',
        policy_number: '  MAX-12345  ',
        organization_id: 1,
      });

      expect(ins.coverage_type).toBe('Comprehensive');
      expect(ins.provider_name).toBe('Max Bupa');
      expect(ins.policy_number).toBe('MAX-12345');
      expect(ins.valid_from).toBeDefined();
      expect(ins.valid_to).toBeDefined();
      expect(ins.member_id).toBe(`MEM-${samplePatient.patient_id}`);
    });

    it('createInsurance supports valid_till fallback for valid_to', () => {
      const ins = patientService.createInsurance({
        patient_id: samplePatient.patient_id,
        provider_name: 'Fallback Provider',
        policy_number: 'FALLBACK-01',
        valid_till: '2028-12-31',
        organization_id: 1,
      });

      expect(ins.valid_to).toBe('2028-12-31');
    });
  });

  describe('generateUhid', () => {
    it('generates a unique UHID prefixed with UHID- and 6 alphanumeric characters', () => {
      const uhid = patientService.generateUhid();
      expect(uhid).toMatch(/^UHID-[0-9A-Z]{6}$/);
    });
  });
});
