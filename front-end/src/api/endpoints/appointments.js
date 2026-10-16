'use strict';

import { request } from '../client.js';

export const appointments = {
  list() {
    return request('GET', '/appointment');
  },
  create(payload) {
    return request('POST', '/appointment', payload);
  },
  update(id, patch) {
    return request('PUT', '/appointment/' + id, patch);
  },
};

