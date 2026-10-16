'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const dataService = require('../services/data.service');
const platformActivityService = require('../services/platformActivity.service');
const billingService = require('../services/billing.service');

describe('Phase 7: Dead Code, Deprecated Routes & Redundant Aliases (CLN-03 – CLN-06)', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    app = createApp();
    const res = await request(app)
      .post('/auth/login/admin')
      .send({ email: 'owner.admin@citygen.com', password: 'Owner@123' });
    adminToken = res.body.token;
  });

  describe('CLN-03: Redundant Request Alias Decommissioning', () => {
    it('returns 404 for decommissioned /request routes', async () => {
      const res = await request(app)
        .get('/request')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('canonical /appointment routes remain operational', async () => {
      const res = await request(app)
        .get('/appointment')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('CLN-04: Dead Collections Removal from dataStore & dataService', () => {
    it('dataStore no longer defines dead collections patientInsuranceDocuments and insurances', () => {
      expect(dataStore.patientInsuranceDocuments).toBeUndefined();
      expect(dataStore.insurances).toBeUndefined();
    });

    it('dataService.getFullState() does not expose dead keys', () => {
      const state = dataService.getFullState();
      expect(state.patientInsuranceDocuments).toBeUndefined();
      expect(state.insurances).toBeUndefined();
      expect(state.stateVersion).toBeUndefined();
      expect(Array.isArray(state.appointments)).toBe(true);
      expect(Array.isArray(state.patients)).toBe(true);
    });

    it('live runtime collection platformActivityLog remains operational', () => {
      expect(Array.isArray(dataStore.platformActivityLog)).toBe(true);
      const entry = platformActivityService.log(1, 'TEST_AUDIT_ACTION', 1, 'Phase 7 verification');
      expect(entry).toBeDefined();
      expect(entry.action).toBe('TEST_AUDIT_ACTION');
      expect(dataStore.platformActivityLog[0].action).toBe('TEST_AUDIT_ACTION');
    });

    it('live runtime collection leaders remains operational', () => {
      expect(Array.isArray(dataStore.leaders)).toBe(true);
      const initialCount = dataStore.leaders.length;
      const leader = billingService.createLeader({
        service_id: 1,
        admission_id: 701,
        quantity: 1,
        organization_id: 1,
        hospital_id: 1,
      });
      expect(leader).toBeDefined();
      expect(leader.leader_id).toBeDefined();
      expect(dataStore.leaders.length).toBe(initialCount + 1);
    });
  });
});
