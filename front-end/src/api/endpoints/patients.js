'use strict';

import { request } from '../client.js';
import { withNormalizedPhones } from '../../lib/phone.js';

export const patients = {
  list() {
    return request('GET', '/patient');
  },
  get(idOrUhid) {
    return request('GET', '/patient/' + idOrUhid);
  },
  portalSummary(id) {
    return request('GET', id ? '/patient/portal/summary/' + id : '/patient/portal/summary');
  },
  create(payload) {
    return request(
      'POST',
      '/patient',
      withNormalizedPhones(payload, ['phone', 'alternate_phone', 'emergency_contact_phone']),
    );
  },
  update(idOrUhid, patch) {
    return request('PUT', '/patient/' + idOrUhid, patch);
  },
  insuranceAll() {
    return request('GET', '/patient/insurance/all');
  },
  insuranceForPatient(id) {
    return request('GET', '/patient/' + id + '/insurance');
  },
  /** Append-only on the backend: a "save" adds a row, readers take max insurance_id. */
  createInsurance(payload) {
    return request('POST', '/patient/insurance', payload);
  },
};

