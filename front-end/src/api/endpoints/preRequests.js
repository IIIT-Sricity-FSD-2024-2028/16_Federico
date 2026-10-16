'use strict';

import { request } from '../client.js';

export const preRequests = {
  list() {
    return request('GET', '/pre-requests');
  },
  get(id) {
    return request('GET', '/pre-requests/' + id);
  },
  create(payload) {
    return request('POST', '/pre-requests', payload);
  },
  /**
   * Two distinct update kinds server-side, split by whether `status` is present.
   * ADMITTED is rejected with 403 - it is only reachable through the ward
   * bed-allocation cascade. DISCHARGED with an unpaid ledger returns 409.
   */
  update(id, patch) {
    return request('PUT', '/pre-requests/' + id, patch);
  },
  checkIn(id, payload) {
    return request('POST', '/pre-requests/' + id + '/check-in', payload);
  },
};

