'use strict';

import { request } from '../client.js';

export const activityLog = {
  list() {
    return request('GET', '/activity-log');
  },
};

