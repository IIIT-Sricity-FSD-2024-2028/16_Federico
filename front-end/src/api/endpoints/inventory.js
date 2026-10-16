'use strict';

import { request } from '../client.js';

export const inventory = {
  items: {
    list() {
      return request('GET', '/inventory/items');
    },
    create(payload) {
      return request('POST', '/inventory/items', payload);
    },
    update(id, patch) {
      return request('PUT', '/inventory/items/' + id, patch);
    },
    remove(id) {
      return request('DELETE', '/inventory/items/' + id);
    },
  },
  requests: {
    list() {
      return request('GET', '/inventory/requests');
    },
    create(payload) {
      return request('POST', '/inventory/requests', payload);
    },
    update(id, patch) {
      return request('PUT', '/inventory/requests/' + id, patch);
    },
  },
};

