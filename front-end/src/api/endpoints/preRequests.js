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
  /** Update a request's status. ADMITTED is only reachable through the ward allocation cascade. */
  update(id, patch) {
    return request('PUT', '/pre-requests/' + id, patch);
  },
  checkIn(id, payload) {
    return request('POST', '/pre-requests/' + id + '/check-in', payload);
  },
};

