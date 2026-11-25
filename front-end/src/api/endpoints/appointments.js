'use strict';

import { request } from '../client.js';

export const appointments = {
  list() {
    return request('GET', '/appointment');
  },
  update(id, patch) {
    return request('PUT', '/appointment/' + id, patch);
  },
};

