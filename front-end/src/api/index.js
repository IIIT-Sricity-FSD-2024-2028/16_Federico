'use strict';

/**
 * The single `api` object, composed from the per-resource modules. Shape is
 * identical to the legacy window.ApiClient / window.API, so call sites port as
 * a straight rename: ApiClient.wards.bedRequests.allocate(a, b) becomes
 * api.wards.bedRequests.allocate(a, b).
 */
import { API_BASE_URL } from './client.js';
import { getSession, setSession, clearSession } from './session.js';

import { auth } from './endpoints/auth.js';
import { marketplace } from './endpoints/marketplace.js';
import { platform } from './endpoints/platform.js';
import { rbac } from './endpoints/rbac.js';
import { doctors } from './endpoints/doctors.js';
import { patients } from './endpoints/patients.js';
import { wards } from './endpoints/wards.js';
import { inventory } from './endpoints/inventory.js';
import { billing } from './endpoints/billing.js';
import { appointments } from './endpoints/appointments.js';
import { admissions } from './endpoints/admissions.js';
import { preRequests } from './endpoints/preRequests.js';
import { activityLog } from './endpoints/activity.js';
import { uploads } from './endpoints/uploads.js';

export const api = {
  BASE_URL: API_BASE_URL,
  getSession,
  setSession,
  clearSession,
  auth,
  marketplace,
  platform,
  rbac,
  doctors,
  patients,
  wards,
  inventory,
  billing,
  appointments,
  admissions,
  preRequests,
  activityLog,
  uploads,
};

export { ApiError } from './errors.js';
export default api;
