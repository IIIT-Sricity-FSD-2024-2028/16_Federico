'use strict';

import { request } from '../client.js';

/**
 * Staff directory calls used by Admin > People. (The custom-role / permission
 * matrix endpoints still exist server-side but no screen uses them since the
 * Roles & Staff page was removed.)
 */
export const rbac = {
  staff() {
    return request('GET', '/rbac/staff');
  },
  createStaff(payload) {
    return request('POST', '/rbac/staff', payload);
  },
  setStaffActive(userId, isActive) {
    return request('PUT', '/rbac/staff/' + userId + '/active', { is_active: isActive });
  },
  setStaffRole(userId, actorRole) {
    return request('PUT', '/rbac/staff/' + userId + '/actor-role', { actor_role: actorRole });
  },
};
