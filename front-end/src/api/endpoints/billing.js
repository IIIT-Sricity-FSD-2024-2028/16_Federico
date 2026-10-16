'use strict';

import { request } from '../client.js';

export const billing = {
  services: {
    list() {
      return request('GET', '/billing/services');
    },
    create(payload) {
      return request('POST', '/billing/services', payload);
    },
  },

  ledger: {
    getByAdmission(admissionId) {
      return request('GET', '/billing/ledger/' + admissionId);
    },
    create(payload) {
      return request('POST', '/billing/ledger', payload);
    },
    listAll() {
      return request('GET', '/billing/ledgers');
    },
    entries(ledgerId) {
      return request('GET', '/billing/ledger/' + ledgerId + '/entries');
    },
    addEntry(payload) {
      return request('POST', '/billing/ledger/entry', payload);
    },
    dispatch(ledgerId) {
      return request('PUT', '/billing/ledger/' + ledgerId + '/dispatch');
    },
  },

  patient: {
    bills(patientId) {
      return request('GET', '/billing/patient/' + patientId + '/bills');
    },
    receipts(patientId) {
      return request('GET', '/billing/patient/' + patientId + '/receipts');
    },
  },

  /** Creating a payment auto-generates the receipt and flips the ledger to PAID. */
  payments: {
    list() {
      return request('GET', '/billing/payments');
    },
    create(payload) {
      return request('POST', '/billing/payments', payload);
    },
  },

  receipts: {
    list() {
      return request('GET', '/billing/receipts');
    },
  },

  dischargeSummary: {
    getByAdmission(admissionId) {
      return request('GET', '/billing/discharge-summary/' + admissionId);
    },
    create(payload) {
      return request('POST', '/billing/discharge-summary', payload);
    },
  },

  /** HOM stages a service charge; FA approves it into the patient ledger. */
  leaders: {
    list() {
      return request('GET', '/billing/leaders');
    },
    create(payload) {
      return request('POST', '/billing/leaders', payload);
    },
    approve(id) {
      return request('PUT', '/billing/leaders/' + id + '/approve');
    },
  },
};

