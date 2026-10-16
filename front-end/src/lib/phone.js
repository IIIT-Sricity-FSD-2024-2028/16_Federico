'use strict';

/**
 * Ported from shared/api-client.js. Applied to the same payload keys as before:
 * `phone` on signup and doctor create, and phone / alternate_phone /
 * emergency_contact_phone on patient create.
 */
export function normalizePhone(phone) {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;
  return '+91' + trimmed.replace(/\D/g, '');
}

export function withNormalizedPhones(payload, keys) {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = { ...payload };
  keys.forEach((key) => {
    if (copy[key]) copy[key] = normalizePhone(copy[key]);
  });
  return copy;
}

