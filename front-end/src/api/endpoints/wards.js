'use strict';

import { request } from '../client.js';

export const wards = {
  list() {
    return request('GET', '/ward');
  },
  create(payload) {
    return request('POST', '/ward', payload);
  },
  update(wardId, patch) {
    return request('PUT', '/ward/' + wardId, patch);
  },
  remove(wardId) {
    return request('DELETE', '/ward/' + wardId);
  },
  beds() {
    return request('GET', '/ward/beds');
  },
  bedsInWard(wardId) {
    return request('GET', '/ward/' + wardId + '/beds');
  },
  createBed(payload) {
    return request('POST', '/ward/bed', payload);
  },
  updateBedStatus(bedId, status) {
    return request('PUT', '/ward/bed/' + bedId, { status });
  },

  bedRequests: {
    list() {
      return request('GET', '/ward/bed-requests');
    },
    create(payload) {
      return request('POST', '/ward/bed-requests', payload);
    },
    update(id, patch) {
      return request('PUT', '/ward/bed-requests/' + id, patch);
    },
    /**
     * HOM allocates a specific bed to a pending request or denies it outright.
     * Both map to the same PUT with different status payloads; allocation
     * cascades server-side into pre_request.status = ADMITTED.
     */
    allocate(requestId, bedId) {
      return request('PUT', '/ward/bed-requests/' + requestId, {
        status: 'ALLOCATED',
        bed_id: bedId,
      });
    },
    deny(requestId) {
      return request('PUT', '/ward/bed-requests/' + requestId, { status: 'DENIED' });
    },
  },
};

