'use strict';

import { request } from '../client.js';
import { withNormalizedPhones } from '../../lib/phone.js';

/** All three endpoints are deliberately public (no Authorization header). */
export const marketplace = {
  organizations() {
    return request('GET', '/marketplace/organizations', undefined, { auth: false });
  },
  plans() {
    return request('GET', '/marketplace/plans', undefined, { auth: false });
  },
  registerOrganization(payload) {
    return request(
      'POST',
      '/marketplace/register-organization',
      withNormalizedPhones(payload, ['phone']),
      { auth: false },
    );
  },
};

