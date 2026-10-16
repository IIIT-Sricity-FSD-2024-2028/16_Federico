'use strict';

/** Shared bits of platform-dashboard.js. */

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export function statusChipClass(status) {
  if (status === 'ACTIVE') return 'md-chip-success';
  if (status === 'SUSPENDED') return 'md-chip-warning';
  return 'md-chip-error';
}
