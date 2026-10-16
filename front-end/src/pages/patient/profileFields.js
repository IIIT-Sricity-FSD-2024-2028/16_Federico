'use strict';

/**
 * The four independently-editable sections of patient-profile.html and the
 * input ids each one owns. The legacy code discovered these by querying
 * `#form-<section> input, select, textarea`; listing them keeps cancel-restore
 * and save able to work on plain state instead of DOM nodes.
 */
export const SECTION_FIELDS = {
  personal: ['first-name', 'last-name', 'dob', 'gender', 'blood-group', 'uhid'],
  contact: ['email', 'phone', 'alt-phone', 'address'],
  password: ['current-password', 'new-password', 'confirm-password'],
  insurance: [
    'ins-provider',
    'ins-coverage',
    'policy-number',
    'member-id',
    'valid-from',
    'valid-to',
    'coverage-amount',
  ],
};

/** `uhid` carried `readonly`, so enableSection() never un-disabled it. */
export const READONLY_FIELDS = ['uhid'];

export function valuesFromProfile(profile) {
  const [firstName, ...rest] = (profile.name || '').split(' ');
  const ins = profile.insurance || {};
  return {
    'first-name': firstName || '',
    'last-name': rest.join(' '),
    dob: profile.dob || '',
    gender: profile.gender || '',
    'blood-group': profile.bloodGroup || '',
    uhid: profile.uhid || '',
    email: profile.email || '',
    phone: profile.phone || '',
    'alt-phone': profile.altPhone || '',
    address: profile.address || '',
    'ins-provider': ins.provider || '',
    'ins-coverage': ins.coverageType || '',
    'policy-number': ins.policyNumber || '',
    'member-id': ins.memberId || '',
    'valid-from': ins.validFrom || '',
    'valid-to': ins.validTo || '',
    'coverage-amount': Number(ins.coverage || 0).toLocaleString('en-IN'),
    // Password inputs were never seeded from the profile.
    'current-password': '',
    'new-password': '',
    'confirm-password': '',
  };
}

export function parseCoverage(value) {
  return Number(String(value).replace(/,/g, '')) || 0;
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

