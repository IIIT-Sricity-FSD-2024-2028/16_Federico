'use strict';

import { dataApi } from '../api/endpoints/data.js';
import { apiThunk } from './thunkHelpers.js';

export const fetchAdminDashboard = apiThunk(
  'data/fetchAdminDashboard',
  () => dataApi.adminDashboard(),
  'Failed to load admin dashboard',
);
