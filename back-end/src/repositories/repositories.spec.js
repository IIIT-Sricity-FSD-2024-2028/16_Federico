'use strict';

const {
  BaseRepository,
  patientRepository,
  doctorRepository,
  wardRepository,
  appointmentRepository,
  preRequestRepository,
  admissionRepository,
  billingRepository,
  inventoryRepository,
  rbacRepository,
  organizationRepository,
  userRepository,
} = require('./index');
const dataStore = require('../store/dataStore');

describe('Repositories (Data Access Layer)', () => {
  describe('BaseRepository Generic CRUD & Atomic Sequences', () => {
    let testRepo;

    beforeEach(() => {
      dataStore._testCollection = [
        { test_id: 1, name: 'Item A', organization_id: 1 },
        { test_id: 2, name: 'Item B', organization_id: 2 },
      ];
      testRepo = new BaseRepository('_testCollection', 'test_id');
    });

    afterEach(() => {
      delete dataStore._testCollection;
    });

    it('generates atomic nextId() starting above existing max id', () => {
      expect(testRepo.nextId()).toBe(3);
      expect(testRepo.nextId()).toBe(4);
    });

    it('findAll() returns all entities or filtered entities', () => {
      expect(testRepo.findAll().length).toBe(2);
      expect(testRepo.findAll((x) => x.organization_id === 1).length).toBe(1);
    });

    it('findById() returns the matched entity or null', () => {
      const found = testRepo.findById(1);
      expect(found).toBeDefined();
      expect(found.name).toBe('Item A');
      expect(testRepo.findById(999)).toBeNull();
    });

    it('create() assigns next id and persists to memory store', () => {
      const created = testRepo.create({ name: 'Item C', organization_id: 1 });
      expect(created.test_id).toBe(3);
      expect(created.created_at).toBeDefined();
      expect(testRepo.findById(3)).toBeDefined();
    });

    it('update() mutates existing record without changing primary key', () => {
      const updated = testRepo.update(1, { name: 'Item A Renamed', test_id: 999 });
      expect(updated.name).toBe('Item A Renamed');
      expect(updated.test_id).toBe(1); // Primary key preserved
      expect(testRepo.findById(1).name).toBe('Item A Renamed');
    });

    it('delete() removes entity by primary key', () => {
      expect(testRepo.delete(1)).toBe(true);
      expect(testRepo.findById(1)).toBeNull();
      expect(testRepo.delete(999)).toBe(false);
    });

    it('scoped() filters and scopes all queries to a specific organization', () => {
      const org1Repo = testRepo.scoped(1);
      expect(org1Repo.findAll().length).toBe(1);
      expect(org1Repo.findById(2)).toBeNull(); // Org 2 record inaccessible
      
      const created = org1Repo.create({ name: 'Scoped Item' });
      expect(created.organization_id).toBe(1);
    });
  });

  describe('PatientRepository Specialized Functions', () => {
    it('generates a valid unique UHID', () => {
      const uhid = patientRepository.generateUhid();
      expect(uhid).toMatch(/^UHID-[A-Z0-9]{6}$/);
    });

    it('finds patient by UHID or ID', () => {
      const patient = patientRepository.create({
        name: 'Test Patient',
        organization_id: 1,
        uhid: 'UHID-TST999',
      });
      expect(patientRepository.findByIdOrUhid(patient.patient_id)).toBeDefined();
      expect(patientRepository.findByIdOrUhid('UHID-TST999')).toBeDefined();
    });
  });

  describe('BillingRepository & PreRequestRepository Scoping', () => {
    it('BillingRepository manages services and ledgers', () => {
      expect(billingRepository.findAllServices()).toBeDefined();
      expect(billingRepository.findAll()).toBeDefined();
    });

    it('PreRequestRepository finds records by status', () => {
      expect(preRequestRepository.findByStatus('PENDING')).toBeDefined();
    });
  });
});
