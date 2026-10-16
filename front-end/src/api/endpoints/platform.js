'use strict';

import { request } from '../client.js';
import { clearSession } from '../session.js';

export const platform = {
  auth: {
    login(email, password) {
      return request('POST', '/platform/auth/login', { email, password }, { auth: false });
    },
    me() {
      return request('GET', '/platform/auth/me');
    },
    async logout() {
      try {
        await request('POST', '/platform/auth/logout');
      } catch {
        /* server may already have dropped the session */
      }
      clearSession();
    },
  },

  organizations: {
    list() {
      return request('GET', '/platform/organizations');
    },
    get(id) {
      return request('GET', '/platform/organizations/' + id);
    },
    provision(payload) {
      return request('POST', '/platform/organizations', payload);
    },
    suspend(id) {
      return request('PUT', '/platform/organizations/' + id + '/suspend');
    },
    activate(id) {
      return request('PUT', '/platform/organizations/' + id + '/activate');
    },
    remove(id) {
      return request('DELETE', '/platform/organizations/' + id);
    },
    /** { email_domain, staff_logins } - how many logins a domain change renames. */
    emailDomainImpact(id) {
      return request('GET', '/platform/organizations/' + id + '/email-domain');
    },
    /** Renames every staff/admin login of the org onto the new domain. */
    changeEmailDomain(id, emailDomain) {
      return request('PATCH', '/platform/organizations/' + id + '/email-domain', {
        email_domain: emailDomain,
      });
    },
    provisioningLog(id) {
      return request('GET', '/platform/organizations/' + id + '/provisioning-log');
    },
    usage(id) {
      return request('GET', '/platform/organizations/' + id + '/usage');
    },
    hospitals(id) {
      return request('GET', '/platform/organizations/' + id + '/hospitals');
    },
    addHospital(id, payload) {
      return request('POST', '/platform/organizations/' + id + '/hospitals', payload);
    },
    modules(id) {
      return request('GET', '/platform/organizations/' + id + '/modules');
    },
    setModule(id, moduleCode, enabled, instances) {
      const body = { enabled };
      if (instances !== undefined && instances !== null) body.instances = instances;
      return request('PUT', '/platform/organizations/' + id + '/modules/' + moduleCode, body);
    },
    resources(id) {
      return request('GET', '/platform/organizations/' + id + '/resources');
    },
    setResources(id, resources) {
      return request('PUT', '/platform/organizations/' + id + '/resources', { resources });
    },
    apiKeys(id) {
      return request('GET', '/platform/organizations/' + id + '/api-keys');
    },
    createApiKey(id, label) {
      return request('POST', '/platform/organizations/' + id + '/api-keys', { label });
    },
    getSubscription(id) {
      return request('GET', '/platform/organizations/' + id + '/subscription');
    },
    setSubscription(id, planId) {
      return request('PUT', '/platform/organizations/' + id + '/subscription', { plan_id: planId });
    },
    renewSubscription(id) {
      return request('PUT', '/platform/organizations/' + id + '/subscription/renew');
    },
  },

  apiKeys: {
    revoke(id) {
      return request('DELETE', '/platform/api-keys/' + id);
    },
  },

  plans: {
    list() {
      return request('GET', '/platform/plans');
    },
    create(payload) {
      return request('POST', '/platform/plans', payload);
    },
    update(id, patch) {
      return request('PUT', '/platform/plans/' + id, patch);
    },
  },

  moduleResourceCatalog() {
    return request('GET', '/platform/module-resource-catalog');
  },

  rates: {
    /** Response shape is { base_platform_fee, rates: {...} } - see defect D3. */
    get() {
      return request('GET', '/platform/rates');
    },
    update(payload) {
      return request('PUT', '/platform/rates', payload);
    },
  },

  usage() {
    return request('GET', '/platform/usage');
  },

  activityLog() {
    return request('GET', '/platform/activity-log');
  },
};

