'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const dataStore = require('../store/dataStore');
const { createSession } = require('../store/sessionStore');

describe('Phase 4: Critical Preserved Defects & Systemic Functional Failures', () => {
  const app = createApp();

  describe('DEF-D11: Password Update (PUT /auth/password)', () => {
    let patientToken;
    let patientUser;

    beforeAll(() => {
      // Find patient user
      patientUser = dataStore.users.find((u) => u.email === 'arjun.k@hosp.com');
      expect(patientUser).toBeDefined();

      // Create session for patient
      patientToken = createSession({
        userId: patientUser.user_id,
        role: 'Patient',
        patientId: 201,
        organizationId: 1,
        hospitalId: 1,
      });
    });

    it('rejects unauthenticated password update request with 401', async () => {
      const res = await request(app)
        .put('/auth/password')
        .send({ newPassword: 'NewPassword123' });

      expect(res.status).toBe(401);
    });

    it('rejects password shorter than 6 characters with 400', async () => {
      const res = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ newPassword: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 6 characters');
    });

    it('rejects incorrect current password with 400', async () => {
      const res = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'ValidNewPassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Current password is incorrect');
    });

    it('successfully updates user password and persists bcrypt hash', async () => {
      const originalHash = patientUser.password_hash;
      const res = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          newPassword: 'BrandNewSecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(patientUser.password_hash).not.toBe(originalHash);

      // Verify that login with new password works
      const loginRes = await request(app)
        .post('/auth/login/patient')
        .send({
          email: 'arjun.k@hosp.com',
          password: 'BrandNewSecurePassword123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();

      // Restore original hash
      patientUser.password_hash = originalHash;
    });
  });

  describe('DEF-D02: Ward Emergencies Dead Code Removal', () => {
    let adminToken;

    beforeAll(() => {
      adminToken = createSession({
        userId: 101,
        role: 'Admin',
        organizationId: 1,
        hospitalId: 1,
      });
    });

    it('confirms deprecated /ward/emergency endpoint is cleanly removed (404)', async () => {
      const res = await request(app)
        .get('/ward/emergency')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('confirms deprecated /ward/emergencies endpoint is cleanly removed (404)', async () => {
      const res = await request(app)
        .get('/ward/emergencies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DEF-D03: Rate Card Base Fee Desync Alignment', () => {
    let platformToken;

    beforeAll(() => {
      platformToken = createSession({
        userId: 1,
        role: 'PLATFORM_SUPER_USER',
        isPlatformUser: true,
      });
    });

    it('returns both base_platform_fee and base_fee alias on GET /platform/rates', async () => {
      const res = await request(app).get('/platform/rates');

      expect(res.status).toBe(200);
      expect(res.body.base_platform_fee).toBeDefined();
      expect(res.body.base_fee).toBeDefined();
      expect(res.body.base_fee).toBe(res.body.base_platform_fee);
    });

    it('accepts base_fee in PUT /platform/rates and returns aligned values', async () => {
      const originalFee = dataStore.platformRates ? dataStore.platformRates.base_platform_fee : 3000;

      const res = await request(app)
        .put('/platform/rates')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ base_fee: 4500 });

      expect(res.status).toBe(200);
      expect(res.body.base_platform_fee).toBe(4500);
      expect(res.body.base_fee).toBe(4500);

      // Restore original fee
      dataStore.platformRates.base_platform_fee = originalFee;
    });
  });
});
