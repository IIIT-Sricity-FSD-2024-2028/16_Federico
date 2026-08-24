'use strict';

const { attachSession, requireSession, requireActor, extractToken } = require('./session');
const { attachTenant, requireTenant, requireModule } = require('./tenant');
const { authorize } = require('./actorAccess');
const { requirePlatformUser } = require('./platformAccess');
const { createSession } = require('../store/sessionStore');
const dataStore = require('../store/dataStore');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Security & Authorization Middleware', () => {
  describe('Session Middleware', () => {
    it('extracts bearer token from authorization header', () => {
      const req = { headers: { authorization: 'Bearer test-token-123' } };
      expect(extractToken(req)).toBe('test-token-123');
    });

    it('requires session and rejects unauthenticated requests with 401', () => {
      const req = { headers: {} };
      const res = mockRes();
      const next = jest.fn();

      requireSession(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows valid session through requireSession', () => {
      const req = { session: { userId: 1, role: 'HOM' } };
      const res = mockRes();
      const next = jest.fn();

      requireSession(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('enforces actor roles through requireActor', () => {
      const guard = requireActor('HOM', 'Admin');
      const res = mockRes();
      const next = jest.fn();

      const invalidReq = { session: { role: 'Patient' } };
      guard(invalidReq, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      const validReq = { session: { role: 'HOM' } };
      guard(validReq, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Tenant Middleware', () => {
    it('attaches tenant from session', () => {
      const req = { session: { organizationId: 2, hospitalId: 3, isPlatformUser: false } };
      const res = mockRes();
      const next = jest.fn();

      attachTenant(req, res, next);
      expect(req.tenant.organizationId).toBe(2);
      expect(req.tenant.hospitalId).toBe(3);
      expect(next).toHaveBeenCalled();
    });

    it('requires tenant and returns 403 if organization context is missing', () => {
      const req = { tenant: { organizationId: null } };
      const res = mockRes();
      const next = jest.fn();

      requireTenant(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ActorAccess & Dynamic RBAC', () => {
    it('authorizes valid static actor permissions', () => {
      const guard = authorize([], 'doctor', 'write'); // HOM allowed
      const res = mockRes();
      const next = jest.fn();

      const req = { session: { role: 'HOM', userId: 1 }, tenant: { organizationId: 1 } };
      guard(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects unauthorized actor permissions with 403', () => {
      const guard = authorize([], 'doctor', 'write'); // Patient not allowed to write doctor
      const res = mockRes();
      const next = jest.fn();

      const req = { session: { role: 'Patient', userId: 1 }, tenant: { organizationId: 1 } };
      guard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Platform Access Middleware', () => {
    it('enforces platform super-user privileges', () => {
      const res = mockRes();
      const next = jest.fn();

      const nonPlatformReq = { session: { isPlatformUser: false } };
      requirePlatformUser(nonPlatformReq, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      const platformReq = { session: { isPlatformUser: true } };
      requirePlatformUser(platformReq, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
