'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const dataService = require('../services/data.service');
const platformActivityService = require('../services/platformActivity.service');
const billingService = require('../services/billing.service');

describe('Route Deprecation & Dead Code Elimination Specifications', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    app = createApp();
    const res = await request(app)
      .post('/auth/login/admin')
      .send({ email: 'owner.admin@citygen.com', password: 'Owner@123' });
    adminToken = res.body.token;
  });

  describe('Redundant Route Deprecations', () => {
    it('returns 404 Not Found for decommissioned /request route aliases', async () => {
      const res = await request(app)
        .get('/request')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('confirms canonical /appointment routes remain fully operational', async () => {
      const res = await request(app)
        .get('/appointment')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Dead Collections Removal from Datastore & Services', () => {
    it('confirms dead collections patientInsuranceDocuments and insurances are removed from dataStore', () => {
      expect(dataStore.patientInsuranceDocuments).toBeUndefined();
      expect(dataStore.insurances).toBeUndefined();
    });

    it('confirms dataService.getFullState() does not expose deprecated or dead keys', () => {
      const state = dataService.getFullState();
      expect(state.patientInsuranceDocuments).toBeUndefined();
      expect(state.insurances).toBeUndefined();
      expect(state.stateVersion).toBeUndefined();
      expect(Array.isArray(state.appointments)).toBe(true);
      expect(Array.isArray(state.patients)).toBe(true);
    });

    it('verifies live runtime collection platformActivityLog remains operational', () => {
      expect(Array.isArray(dataStore.platformActivityLog)).toBe(true);
      const entry = platformActivityService.log(1, 'TEST_AUDIT_ACTION', 1, 'Phase 7 verification');
      expect(entry).toBeDefined();
      expect(entry.action).toBe('TEST_AUDIT_ACTION');
      expect(dataStore.platformActivityLog[0].action).toBe('TEST_AUDIT_ACTION');
    });

    it('verifies live runtime collection leaders remains operational', () => {
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
