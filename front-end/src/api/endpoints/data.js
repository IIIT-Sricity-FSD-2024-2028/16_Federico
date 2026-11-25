'use strict';

import { request } from '../client.js';

export const dataApi = {
  adminDashboard: () => request('GET', '/data/admin-dashboard'),
};
