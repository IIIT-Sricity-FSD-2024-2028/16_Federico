'use strict';

import { request } from '../client.js';
import { setSession, clearSession } from '../session.js';
import { withNormalizedPhones } from '../../lib/phone.js';
import { ACTOR_LOGIN_SLUG } from '../../lib/emailIdentity.js';

export const auth = {
  /**
   * POST /auth/login/:actor - the portal the unified login page read from the
   * email's tag (ACTOR_LOGIN_SLUG); the server rejects any other role. The
   * session written here mirrors the legacy client exactly, including the
   * fields the backend never actually returns (organizationId, hospitalId,
   * orgName - see defect D12). rbac's authenticate() overwrites this session
   * immediately afterwards, which is why the dead fields never mattered.
   */
  async login(actor, email, password, organizationId) {
    const slug = ACTOR_LOGIN_SLUG[actor];
    if (!slug) throw new Error('Unknown portal: ' + actor);
    const body = { email, password };
    if (organizationId !== undefined && organizationId !== null) {
      body.organization_id = organizationId;
    }
    const payload = await request('POST', '/auth/login/' + slug, body, { auth: false });
    if (payload && payload.token) {
      setSession({
        token: payload.token,
        actor: payload.role || (payload.user ? payload.user.role : null),
        userId: payload.user ? payload.user.user_id : null,
        email: payload.user ? payload.user.email : email,
        name: payload.user ? payload.user.name : null,
        role: payload.role || (payload.user ? payload.user.role : null),
        roleId: payload.user ? payload.user.role_id : null,
        organizationId:
          payload.organizationId ||
          (payload.user ? payload.user.organization_id : null) ||
          (payload.tenant ? payload.tenant.organization_id : null),
        hospitalId:
          payload.hospitalId ||
          (payload.user ? payload.user.hospital_id : null) ||
          (payload.tenant ? payload.tenant.hospital_id : null),
        patientId: payload.patientId || (payload.patient ? payload.patient.patient_id : null),
        orgName:
          payload.orgName ||
          (payload.organization ? payload.organization.organization_name : null) ||
          (payload.tenant ? payload.tenant.organization_name : null),
        orgBranding: payload.orgBranding || null,
      });
    }
    return payload;
  },

  async signup(userData) {
    const payload = await request(
      'POST',
      '/auth/signup',
      withNormalizedPhones(userData, ['phone']),
      { auth: false },
    );
    if (payload && payload.token) {
      setSession({
        token: payload.token,
        actor: 'Patient',
        userId: payload.user ? payload.user.user_id : null,
        email: payload.user ? payload.user.email : userData.email,
        name: payload.user ? payload.user.name : userData.name,
        role: 'Patient',
        roleId: 2,
        organizationId: payload.organizationId || userData.organization_id || 1,
        hospitalId: payload.hospitalId || userData.hospital_id || 1,
        patientId: payload.patientId || (payload.patient ? payload.patient.patient_id : null),
      });
    }
    return payload;
  },

  me() {
    return request('GET', '/auth/me');
  },

  entitlements() {
    return request('GET', '/auth/entitlements');
  },

  demoAccounts() {
    return request('GET', '/auth/demo-accounts', undefined, { auth: false });
  },

  changePassword(newPassword, currentPassword) {
    return request('PUT', '/auth/password', { newPassword, currentPassword });
  },

  /** Best-effort server-side invalidation; the local session clears regardless. */
  async logout() {
    try {
      await request('POST', '/auth/logout');
    } catch {
      /* server may already have dropped the session */
    }
    clearSession();
  },
};

