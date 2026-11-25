'use strict';

import {
  normalizeDomain,
  emailDomainProblem,
  buildTaggedEmail,
} from './emailIdentity.js';
import { normalizePhone } from './phone.js';

/**
 * Dependency-free validation & input-formatting module for OrgSignupPage.jsx.
 * Loaded directly by back-end/src/test/frontend_shared.spec.js via loadEsmModule.
 */

export const STEP2_LIMITS = {
  generalBeds: { id: 'res-general-beds', label: 'General Ward Beds', min: 1, max: 10000 },
  icuBeds: { id: 'res-icu-beds', label: 'ICU Beds', min: 1, max: 5000 },
  privateBeds: { id: 'res-private-beds', label: 'Private / Semi-Private Beds', min: 1, max: 5000 },
  doctorSeats: { id: 'res-doctor-seats', label: 'Doctor Directory Seats', min: 1, max: 10000 },
  staffSeats: { id: 'res-staff-seats', label: 'Staff Accounts', min: 1, max: 10000 },
  terminals: { id: 'res-terminals', label: 'Billing Terminals', min: 1, max: 1000 },
  warehouses: { id: 'res-warehouses', label: 'Central Warehouses', min: 1, max: 500 },
  admissions: { id: 'res-patient-admissions', label: 'Estimated Admissions / Month', min: 1, max: 1000000 },
};

export const CORPORATE_BANKS = [
  'HDFC Bank Corporate',
  'ICICI Bank Corporate',
  'State Bank of India',
  'Axis Bank',
];

export const PAYMENT_METHODS = ['card', 'upi', 'netbanking'];

export const ADMIN_PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_])\S{8,128}$/;

export const PASSWORD_RULES = [
  { id: 'length', label: '8–128 characters', test: (pw) => pw.length >= 8 && pw.length <= 128 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'digit', label: 'One number (0–9)', test: (pw) => /\d/.test(pw) },
  { id: 'special', label: 'One special character (!@#$…)', test: (pw) => /[\W_]/.test(pw) },
  { id: 'nospace', label: 'No spaces', test: (pw) => pw.length > 0 && !/\s/.test(pw) },
];

const STRICT_DOMAIN_REGEX =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const TLD_ALPHA_REGEX = /\.[a-z]{2,}$/;
const CITY_ALLOWED_REGEX = /^[\p{L}\p{N}\s.,'()-]+$/u;
const SPECIALTY_ALLOWED_REGEX = /^[\p{L}\p{N}\s&.,'()/-]+$/u;
const ADMIN_NAME_ALLOWED_REGEX = /^[\p{L}\p{M}\s.'-]+$/u;
const EMAIL_LOCAL_PREFIX_REGEX = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function digitsOnly(raw, maxLen) {
  const cleaned = String(raw ?? '').replace(/\D/g, '');
  return typeof maxLen === 'number' ? cleaned.slice(0, maxLen) : cleaned;
}

export function filterPhoneInput(raw) {
  return String(raw ?? '').replace(/[^0-9+\s()-]/g, '').slice(0, 20);
}

export function formatCardNumber(raw) {
  const digits = digitsOnly(raw, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatCardExpiry(raw, prevRaw = '') {
  const str = String(raw ?? '');
  if (prevRaw.endsWith(' / ') && str === prevRaw.slice(0, -1)) {
    return str.slice(0, 1);
  }
  const digits = digitsOnly(str, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

export function passesLuhn(digits) {
  const clean = String(digits || '');
  if (!/^\d+$/.test(clean)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i -= 1) {
    let digit = Number(clean[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function evaluatePasswordRules(password) {
  const pw = String(password || '');
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(pw),
  }));
}

export function parseSpecialties(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { items: [], error: null };

  const parts = trimmed.split(',').map((s) => s.trim());
  if (parts.some((p) => p.length === 0)) {
    return {
      items: [],
      error: 'Remove empty commas or enter valid specialty names.',
    };
  }
  if (parts.length > 15) {
    return { items: [], error: 'Enter at most 15 specialties.' };
  }

  const seen = new Set();
  for (const item of parts) {
    if (item.length < 2 || item.length > 50) {
      return {
        items: [],
        error: `Each specialty must be 2–50 characters ("${item}").`,
      };
    }
    if (/[<>]/.test(item) || !SPECIALTY_ALLOWED_REGEX.test(item) || !/\p{L}/u.test(item)) {
      return {
        items: [],
        error: `Enter a valid specialty name ("${item}").`,
      };
    }
    const key = item.toLowerCase();
    if (seen.has(key)) {
      return { items: [], error: `Duplicate specialty: "${item}".` };
    }
    seen.add(key);
  }
  return { items: parts, error: null };
}

export function toPositiveIntOrNull(raw) {
  const str = String(raw ?? '').trim();
  if (!/^\d+$/.test(str)) return null;
  const n = Number(str);
  return Number.isSafeInteger(n) ? n : null;
}

export function validateStep1Field(field, org, { knownOrgs = [], effectiveEmailDomain } = {}) {
  const data = org || {};
  switch (field) {
    case 'name': {
      const val = String(data.name || '').trim();
      if (!val) return 'Please enter your hospital or chain name.';
      if (val.length < 2 || val.length > 120) {
        return 'Hospital name must be between 2 and 120 characters.';
      }
      if (/[<>]/.test(val)) return 'Hospital name cannot contain < or > characters.';
      if (!/\p{L}/u.test(val)) return 'Hospital name must include letters.';
      return null;
    }
    case 'emailDomain': {
      const candidate =
        effectiveEmailDomain !== undefined ? effectiveEmailDomain : data.emailDomain;
      const normalized = normalizeDomain(candidate);
      if (!normalized) {
        return 'Please enter a staff email domain (e.g. yourhospital.com).';
      }
      if (normalized.length > 253) {
        return 'Email domain must be 253 characters or fewer.';
      }
      if (!STRICT_DOMAIN_REGEX.test(normalized) || !TLD_ALPHA_REGEX.test(normalized)) {
        return 'Use a valid domain format like yourhospital.com.';
      }
      return emailDomainProblem(normalized, knownOrgs);
    }
    case 'city': {
      const val = String(data.city || '').trim();
      if (!val) return 'Please enter the primary city or campus.';
      if (val.length < 2 || val.length > 80) {
        return 'City or campus must be between 2 and 80 characters.';
      }
      if (/[<>]/.test(val) || !CITY_ALLOWED_REGEX.test(val) || !/\p{L}/u.test(val)) {
        return 'Enter a valid city or campus name using letters.';
      }
      return null;
    }
    case 'phone': {
      const raw = String(data.phone || '').trim();
      if (!raw) return 'Please enter a contact phone number.';
      if (!/^\+?[\d\s()-]+$/.test(raw)) {
        return 'Phone number may only contain digits, spaces, +, -, and parentheses.';
      }
      const digits = raw.replace(/\D/g, '');
      if (/^0+$/.test(digits)) {
        return 'Please enter a valid contact phone number.';
      }
      if (raw.startsWith('+')) {
        if (!/^\+[1-9]/.test(raw)) {
          return 'Include a valid country code after + (e.g. +91 98765 43210).';
        }
        if (raw.startsWith('+91')) {
          if (digits.length !== 12 || digits[2] === '0') {
            return 'Indian numbers with +91 must have 10 digits (not starting with 0).';
          }
        } else if (digits.length < 10 || digits.length > 15) {
          return 'Enter a valid international phone number (10–15 digits).';
        }
      } else {
        if (digits.length !== 10 || digits.startsWith('0')) {
          return 'Enter a 10-digit mobile/landline number or include a country code like +91.';
        }
      }
      const normalized = normalizePhone(raw);
      if (!normalized || normalized.replace(/\D/g, '').length < 10) {
        return 'Please enter a valid contact phone number.';
      }
      return null;
    }
    case 'address': {
      const val = String(data.address || '').trim();
      if (!val) return null;
      if (val.length < 5 || val.length > 250) {
        return 'Address must be between 5 and 250 characters when provided.';
      }
      if (/[<>]/.test(val)) return 'Address cannot contain < or > characters.';
      if (!/[\p{L}\p{N}]/u.test(val)) return 'Enter a valid street or campus address.';
      return null;
    }
    case 'specialties': {
      return parseSpecialties(data.specialties).error;
    }
    default:
      return null;
  }
}

export function validateStep2Field(key, rawValue) {
  const limits = STEP2_LIMITS[key];
  if (!limits) return null;
  const str = String(rawValue ?? '').trim();
  if (!str) return 'Enter a whole number (minimum 1).';
  if (!/^\d+$/.test(str)) return 'Enter a whole number without decimals or symbols.';
  const num = Number(str);
  if (!Number.isSafeInteger(num) || num < limits.min) {
    return `Minimum is ${limits.min}.`;
  }
  if (num > limits.max) {
    return `Maximum is ${limits.max.toLocaleString('en-IN')}.`;
  }
  return null;
}

export function validateStep3Field(field, admin, { emailDomain } = {}) {
  const data = admin || {};
  switch (field) {
    case 'name': {
      const val = String(data.name || '').trim();
      if (!val) return "Please enter the administrator's full name.";
      if (val.length < 2 || val.length > 80) {
        return 'Administrator name must be between 2 and 80 characters.';
      }
      if (/[<>]/.test(val) || !ADMIN_NAME_ALLOWED_REGEX.test(val) || !/\p{L}/u.test(val)) {
        return "Enter a valid name (letters, spaces, ., ', - only).";
      }
      return null;
    }
    case 'emailName': {
      const raw = String(data.emailName || '').trim().toLowerCase();
      if (!raw) return 'Please enter an admin email username.';
      if (!/^[a-z0-9._-]+$/.test(raw)) {
        return 'Use only letters, numbers, dots (.), hyphens (-), and underscores (_).';
      }
      if (raw.length < 2 || raw.length > 40) {
        return 'Admin email username must be between 2 and 40 characters.';
      }
      if (!EMAIL_LOCAL_PREFIX_REGEX.test(raw) || /\.\./.test(raw)) {
        return 'Start and end with a letter or number, with no consecutive dots (..).';
      }
      const domain = normalizeDomain(emailDomain);
      if (!domain) {
        return 'Set a valid staff email domain in Step 1 first.';
      }
      if (!buildTaggedEmail(raw, 'admin', domain)) {
        return 'Enter a valid admin email username.';
      }
      return null;
    }
    case 'password': {
      const pw = String(data.password || '');
      if (!pw) return 'Please create an administrator password.';
      if (/\s/.test(pw)) return 'Password cannot contain spaces.';
      if (pw.length < 8 || pw.length > 128) {
        return 'Password must be between 8 and 128 characters.';
      }
      if (!ADMIN_PASSWORD_REGEX.test(pw)) {
        return 'Password must include uppercase, lowercase, a number, and a special character.';
      }
      return null;
    }
    default:
      return null;
  }
}

export function validateStep4Field(field, paymentMethod, payment, now = new Date()) {
  const data = payment || {};
  if (paymentMethod === 'card') {
    if (field === 'cardNumber') {
      const raw = String(data.cardNumber || '').trim();
      if (!raw) return 'Please enter a card number.';
      if (!/^[\d\s]+$/.test(raw)) return 'Card number must contain digits only.';
      const digits = raw.replace(/\s+/g, '');
      if (digits.length < 13 || digits.length > 19) {
        return 'Card number must be between 13 and 19 digits.';
      }
      if (/^(\d)\1+$/.test(digits) || !passesLuhn(digits)) {
        return 'Enter a valid card number.';
      }
      return null;
    }
    if (field === 'cardExpiry') {
      const raw = String(data.cardExpiry || '').trim();
      if (!raw) return 'Please enter the card expiry date.';
      const match = /^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/.exec(raw);
      if (!match) return 'Enter expiry in MM / YY format with a valid month (01–12).';
      const month = Number(match[1]);
      const year = 2000 + Number(match[2]);
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return 'This card has expired.';
      }
      if (year > currentYear + 25) {
        return 'Enter a realistic expiry year.';
      }
      return null;
    }
    if (field === 'cardCvv') {
      const raw = String(data.cardCvv || '').trim();
      if (!raw) return 'Please enter the 3 or 4 digit CVV / CVC.';
      if (!/^\d{3,4}$/.test(raw)) return 'CVV / CVC must be 3 or 4 digits.';
      return null;
    }
    return null;
  }

  if (paymentMethod === 'upi') {
    if (field === 'upiId') {
      const raw = String(data.upiId || '').trim();
      if (!raw) return 'Please enter your UPI ID / VPA.';
      if (/\s/.test(raw)) return 'UPI ID cannot contain spaces.';
      if (!UPI_REGEX.test(raw)) {
        return 'Enter a valid UPI ID (e.g. hospital@okhdfcbank).';
      }
      const localPart = raw.split('@')[0];
      if (/^\.|\.$|\.\./.test(localPart)) {
        return 'UPI ID username cannot start/end with a dot or have consecutive dots.';
      }
      return null;
    }
    return null;
  }

  if (paymentMethod === 'netbanking') {
    if (field === 'bankName') {
      const val = String(data.bankName || '').trim();
      if (!val) return 'Please select a corporate bank.';
      if (!CORPORATE_BANKS.includes(val)) return 'Select a valid corporate bank from the list.';
      return null;
    }
    return null;
  }

  return null;
}

function summarizeValidation(fields, errors) {
  const firstErrorField = fields.find((f) => Boolean(errors[f])) || null;
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
  };
}

export function validateStep1(org, opts = {}) {
  const fields = ['name', 'emailDomain', 'city', 'phone', 'address', 'specialties'];
  const errors = {};
  for (const f of fields) {
    const msg = validateStep1Field(f, org, opts);
    if (msg) errors[f] = msg;
  }
  return summarizeValidation(fields, errors);
}

export function validateStep2(res) {
  const fields = Object.keys(STEP2_LIMITS);
  const errors = {};
  for (const f of fields) {
    const msg = validateStep2Field(f, res ? res[f] : '');
    if (msg) errors[f] = msg;
  }
  return summarizeValidation(fields, errors);
}

export function validateStep3(admin, opts = {}) {
  const fields = ['name', 'emailName', 'password'];
  const errors = {};
  for (const f of fields) {
    const msg = validateStep3Field(f, admin, opts);
    if (msg) errors[f] = msg;
  }
  return summarizeValidation(fields, errors);
}

export function validateStep4(paymentMethod, payment, now = new Date()) {
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return {
      valid: false,
      errors: { paymentMethod: 'Please select a payment method.' },
      firstErrorField: 'paymentMethod',
    };
  }
  const fields =
    paymentMethod === 'card'
      ? ['cardNumber', 'cardExpiry', 'cardCvv']
      : paymentMethod === 'upi'
        ? ['upiId']
        : ['bankName'];
  const errors = {};
  for (const f of fields) {
    const msg = validateStep4Field(f, paymentMethod, payment, now);
    if (msg) errors[f] = msg;
  }
  return summarizeValidation(fields, errors);
}

export function validateAllSteps({
  org,
  res,
  admin,
  paymentMethod,
  payment,
  knownOrgs = [],
  effectiveEmailDomain,
  now = new Date(),
}) {
  const s1 = validateStep1(org, { knownOrgs, effectiveEmailDomain });
  const s2 = validateStep2(res);
  const s3 = validateStep3(admin, {
    emailDomain: effectiveEmailDomain !== undefined ? effectiveEmailDomain : org?.emailDomain,
  });
  const s4 = validateStep4(paymentMethod, payment, now);
  return {
    valid: s1.valid && s2.valid && s3.valid && s4.valid,
    steps: { 1: s1, 2: s2, 3: s3, 4: s4 },
    firstInvalidStep: !s1.valid ? 1 : !s2.valid ? 2 : !s3.valid ? 3 : !s4.valid ? 4 : null,
  };
}
