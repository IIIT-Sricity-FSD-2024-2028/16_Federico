'use strict';

/**
 * The four independently-editable sections of patient-profile.html and the
 * input ids each one owns.
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
  const p = profile || {};
  const firstName =
    p.firstName ||
    p.first_name ||
    (p.name ? String(p.name).trim().split(/\s+/)[0] : '') ||
    '';
  const lastName =
    p.lastName ||
    p.last_name ||
    (p.name ? String(p.name).trim().split(/\s+/).slice(1).join(' ') : '') ||
    '';
  const ins = p.insurance || {};
  const today = new Date().toISOString().split('T')[0];
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const rawGender = p.gender || '';
  const gender = rawGender !== 'Unknown' && rawGender !== 'Select gender' ? rawGender : '';
  const rawBlood = p.bloodGroup || p.blood_group || '';
  const bloodGroup = rawBlood !== 'NA' && rawBlood !== 'Unknown' ? rawBlood : '';
  const patientNum = p.patientId || p.patient_id;

  return {
    'first-name': firstName,
    'last-name': lastName,
    dob: p.dob ? String(p.dob).split('T')[0] : '',
    gender,
    'blood-group': bloodGroup,
    uhid: p.uhid || '',
    email: p.email || '',
    phone: p.phone || '',
    'alt-phone': p.altPhone || p.alternate_phone || '',
    address: p.address || '',
    'ins-provider': ins.provider || 'Self Pay',
    'ins-coverage': ins.coverageType || 'Full',
    'policy-number': ins.policyNumber || '',
    'member-id': ins.memberId || (patientNum ? `MEM-${patientNum}` : ''),
    'valid-from': ins.validFrom ? String(ins.validFrom).split('T')[0] : today,
    'valid-to': ins.validTo ? String(ins.validTo).split('T')[0] : nextYear,
    'coverage-amount': ins.coverage ? Number(ins.coverage).toLocaleString('en-IN') : '0',
    'current-password': '',
    'new-password': '',
    'confirm-password': '',
  };
}

export function parseCoverage(value) {
  const num = Number(String(value || '').replace(/,/g, ''));
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export function capitalize(value = '') {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Frontend input validation helpers */
export function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function isValidPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function isFutureDate(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr > today;
}

export function validatePersonal(values) {
  const firstName = String(values['first-name'] || '').trim();
  if (!firstName) return { valid: false, error: 'Please enter your first name.' };
  if (firstName.length < 2 || firstName.length > 50) {
    return { valid: false, error: 'First name must be between 2 and 50 characters.' };
  }
  if (!/^[a-zA-Z\s.'-]+$/.test(firstName)) {
    return { valid: false, error: 'First name contains invalid characters.' };
  }

  const lastName = String(values['last-name'] || '').trim();
  if (lastName && lastName.length > 50) {
    return { valid: false, error: 'Last name cannot exceed 50 characters.' };
  }
  if (lastName && !/^[a-zA-Z\s.'-]+$/.test(lastName)) {
    return { valid: false, error: 'Last name contains invalid characters.' };
  }

  const dob = String(values.dob || '').trim();
  if (!dob) return { valid: false, error: 'Please enter your date of birth.' };
  if (isFutureDate(dob)) return { valid: false, error: 'Date of birth cannot be in the future.' };
  const birthYear = new Date(dob).getFullYear();
  const currentYear = new Date().getFullYear();
  if (birthYear < currentYear - 120 || Number.isNaN(birthYear)) {
    return { valid: false, error: 'Please enter a valid date of birth.' };
  }

  const gender = String(values.gender || '').trim();
  if (!gender || gender === 'Select gender') {
    return { valid: false, error: 'Please select your gender.' };
  }

  const rawBlood = String(values['blood-group'] || '').trim();
  const bloodGroup = rawBlood === 'Select group' || rawBlood === 'NA' ? '' : rawBlood;

  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  return {
    valid: true,
    payload: {
      name: fullName,
      firstName,
      lastName,
      dob,
      gender,
      bloodGroup,
    },
  };
}

export function validateContact(values, normalizePhoneFn) {
  const email = String(values.email || '').trim();
  if (!email) return { valid: false, error: 'Please enter your email address.' };
  if (!isValidEmail(email)) return { valid: false, error: 'Please enter a valid email address.' };

  const phone = String(values.phone || '').trim();
  if (!phone) return { valid: false, error: 'Please enter your phone number.' };
  if (!isValidPhone(phone)) return { valid: false, error: 'Please enter a valid 10-digit phone number.' };

  const altPhone = String(values['alt-phone'] || '').trim();
  if (altPhone) {
    if (!isValidPhone(altPhone)) {
      return { valid: false, error: 'Please enter a valid alternate phone number.' };
    }
    const cleanP = phone.replace(/\D/g, '').slice(-10);
    const cleanAlt = altPhone.replace(/\D/g, '').slice(-10);
    if (cleanP === cleanAlt) {
      return { valid: false, error: 'Alternate phone number must be different from primary phone number.' };
    }
  }

  const address = String(values.address || '').trim();
  if (address && address.length > 250) {
    return { valid: false, error: 'Address cannot exceed 250 characters.' };
  }

  const norm = normalizePhoneFn || ((p) => p);
  return {
    valid: true,
    payload: {
      email,
      phone: norm(phone),
      altPhone: altPhone ? norm(altPhone) : null,
      address,
    },
  };
}

export function validatePassword(values) {
  const currentPassword = String(values['current-password'] || '');
  const nextPassword = String(values['new-password'] || '');
  const confirmPassword = String(values['confirm-password'] || '');

  if (!currentPassword) return { valid: false, error: 'Please enter your current password.' };
  if (!nextPassword) return { valid: false, error: 'Please enter a new password.' };
  if (nextPassword.length < 6) return { valid: false, error: 'Password must be at least 6 characters.' };
  if (nextPassword === currentPassword) {
    return { valid: false, error: 'New password must be different from current password.' };
  }
  if (nextPassword !== confirmPassword) return { valid: false, error: 'Passwords do not match.' };

  return { valid: true };
}

export function validateInsurance(values) {
  const provider = String(values['ins-provider'] || '').trim();
  if (!provider) return { valid: false, error: 'Please enter your insurance provider.' };

  const coverageType = String(values['ins-coverage'] || '').trim();
  if (!coverageType || coverageType === 'Select coverage') {
    return { valid: false, error: 'Please select coverage type.' };
  }

  const policyNumber = String(values['policy-number'] || '').trim();
  if (!policyNumber) return { valid: false, error: 'Please enter policy number.' };
  if (policyNumber.length < 3) return { valid: false, error: 'Policy number must be at least 3 characters.' };

  const validFrom = String(values['valid-from'] || '').trim();
  const validTo = String(values['valid-to'] || '').trim();
  if (validFrom && validTo && validTo < validFrom) {
    return { valid: false, error: 'Insurance expiry date cannot be earlier than valid-from date.' };
  }

  const coverage = parseCoverage(values['coverage-amount']);

  return {
    valid: true,
    payload: {
      provider,
      coverageType,
      policyNumber,
      memberId: String(values['member-id'] || '').trim(),
      validFrom,
      validTo,
      coverage,
    },
  };
}
