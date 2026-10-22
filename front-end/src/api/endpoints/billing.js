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
    async create(payload) {
      const signature = [payload?.ledger_id, payload?.amount_paid, payload?.payment_mode || 'Cash'].join(':');
      const storageKey = 'billing-payment:' + signature;
      const memory = paymentKeys;
      let idempotencyKey;
      try {
        idempotencyKey = sessionStorage.getItem(storageKey);
        if (!idempotencyKey) {
          idempotencyKey = makeIdempotencyKey();
          sessionStorage.setItem(storageKey, idempotencyKey);
        }
      } catch {
        idempotencyKey = memory.get(storageKey);
        if (!idempotencyKey) {
          idempotencyKey = makeIdempotencyKey();
          memory.set(storageKey, idempotencyKey);
        }
      }
      const result = await request('POST', '/billing/payments', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        memory.delete(storageKey);
      }
      return result;
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

const paymentKeys = new Map();
function makeIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'pay-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

