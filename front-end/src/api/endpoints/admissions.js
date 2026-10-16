'use strict';

import { request } from '../client.js';

export const admissions = {
  list() {
    return request('GET', '/admission');
  },
  get(id) {
    return request('GET', '/admission/' + id);
  },
  create(payload) {
    return request('POST', '/admission', payload);
  },
  update(id, patch) {
    return request('PUT', '/admission/' + id, patch);
  },
};

