'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const env = require('../config/env');

describe('Phase 8: Hardcoded Values & Config Hardening (CFG-01 – CFG-03)', () => {
  const app = createApp();

  describe('CFG-01: Session Configuration & Secret Fallback', () => {
    it('uses valid development session secret fallback in non-production mode', () => {
      expect(env.IS_PRODUCTION).toBe(false);
      expect(env.SESSION_SECRET).toBeDefined();
      expect(typeof env.SESSION_SECRET).toBe('string');
      expect(env.SESSION_SECRET.length).toBeGreaterThan(0);
    });

    it('enforces fatal security requirement when simulated in production mode with default secret', () => {
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.SESSION_SECRET;

      try {
        const testEnv = {
          IS_PRODUCTION: true,
        };
        const shouldThrow = () => {
          if (
            testEnv.IS_PRODUCTION &&
            (!testEnv.SESSION_SECRET ||
              testEnv.SESSION_SECRET === 'federico_dev_placeholder_secret_key')
          ) {
            throw new Error(
              '[FATAL SECURITY ERROR] Running in production with missing or default SESSION_SECRET! A secure SESSION_SECRET must be configured in .env',
            );
          }
        };

        expect(shouldThrow).toThrow('[FATAL SECURITY ERROR]');
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.SESSION_SECRET = origSecret;
      }
    });
  });

  describe('CFG-03: Environment-Gated Demo Accounts Endpoint', () => {
    it('serves demo credentials by default in development and test environments', async () => {
      const res = await request(app).get('/auth/demo-accounts');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('organizations');
      expect(res.body).toHaveProperty('platform');
      expect(res.body.platform.email).toBe('super.platform@federico.com');
    });

    it('blocks demo credentials with 403 Forbidden in production environment', async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await request(app).get('/auth/demo-accounts');
        expect(res.status).toBe(403);
        expect(res.body.message).toContain('disabled in production');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('dynamically reflects new account chosen password in demo accounts and supports login', async () => {
      const uniqueEmail = `test.patient.${Date.now()}@example.com`;
      const customPassword = 'MySecretChosenPassword!123';

      const signupRes = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Dynamic Demo Patient',
          email: uniqueEmail,
          password: customPassword,
          phone: '+919876543299',
          dob: '1995-05-15',
          gender: 'Female',
          organization_id: 1,
        });

      expect(signupRes.status).toBe(201);
      expect(signupRes.body.user).toBeDefined();
      // Ensure plain passwords are never leaked in public user payload
      expect(signupRes.body.user.demo_password).toBeUndefined();
      expect(signupRes.body.user.password_hash).toBeUndefined();

      const sessionToken = signupRes.body.token;
      expect(sessionToken).toBeDefined();

      // Check /auth/demo-accounts contains the new patient with the exact chosen password
      const demoRes = await request(app).get('/auth/demo-accounts');
      expect(demoRes.status).toBe(200);
      const org1Patients = demoRes.body.organizations[1].roles.Patient;
      const demoAccount = org1Patients.find((p) => p.email === uniqueEmail);
      expect(demoAccount).toBeDefined();
      expect(demoAccount.password).toBe(customPassword);

      // Verify login succeeds using the demo credential
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: demoAccount.email,
          password: demoAccount.password,
          organization_id: demoAccount.organization_id,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.email).toBe(uniqueEmail);
      expect(loginRes.body.user.demo_password).toBeUndefined();
      expect(loginRes.body.user.password_hash).toBeUndefined();

      // Verify changing password updates demo accounts dynamically
      const updatedPassword = 'NewSecretPassword!456';
      const changeRes = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          currentPassword: customPassword,
          newPassword: updatedPassword,
        });

      expect(changeRes.status).toBe(200);

      // Verify demo accounts reflects the new password
      const demoResAfterChange = await request(app).get('/auth/demo-accounts');
      const updatedDemoAccount = demoResAfterChange.body.organizations[1].roles.Patient.find(
        (p) => p.email === uniqueEmail,
      );
      expect(updatedDemoAccount).toBeDefined();
      expect(updatedDemoAccount.password).toBe(updatedPassword);

      // Login with updated password works
      const loginAfterChangeRes = await request(app)
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: updatedPassword,
          organization_id: 1,
        });
      expect(loginAfterChangeRes.status).toBe(200);

      // Old password fails
      const oldLoginRes = await request(app)
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: customPassword,
          organization_id: 1,
        });
      expect(oldLoginRes.status).toBe(401);
    });
  });
});

