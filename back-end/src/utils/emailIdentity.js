'use strict';

/**
 * Login email convention (mirrored in front-end/src/lib/emailIdentity.js —
 * keep the two in step):
 *
 *   <name>[.<tag>]@<domain>
 *
 * - The optional tag in the local part names the actor: .hom .pre .fa .admin
 *   .platform. No tag means Patient.
 * - Staff (HOM/PRE/FA/Admin) use their hospital's `email_domain`, so the
 *   domain identifies the organization. Patients keep personal emails.
 * - Platform Super Users live on PLATFORM_EMAIL_DOMAIN.
 *
 * An address only counts as staff when it is tagged AND on a hospital domain;
 * that decision needs the organization list, so it lives with the callers.
 */

const EMAIL_PATTERN =
  /^([^\s@]+?)(?:\.(hom|pre|fa|admin|platform))?@([^\s@]+\.[^\s@]+)$/i;

const TAG_TO_ACTOR = {
  hom: 'HOM',
  pre: 'PRE',
  fa: 'FA',
  admin: 'Admin',
  platform: 'PLATFORM',
};

const ACTOR_TO_TAG = Object.fromEntries(
  Object.entries(TAG_TO_ACTOR).map(([tag, actor]) => [actor, tag]),
);

const PLATFORM_EMAIL_DOMAIN = 'federico.com';

// Domains no hospital may claim: public mailbox providers (patients sign in
// with these) and the platform's own domain.
const RESERVED_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'rediffmail.com',
  PLATFORM_EMAIL_DOMAIN,
];

const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const DOMAIN_FILLER_WORDS = new Set([
  'hospital',
  'hospitals',
  'clinic',
  'clinics',
  'medical',
  'centre',
  'center',
  'institute',
  'healthcare',
  'the',
  'of',
  'and',
]);

/** { name, tag, actor, domain } for a well-formed address, else null. Untagged → actor 'Patient'. */
function parseEmail(email) {
  const match = EMAIL_PATTERN.exec(String(email || '').trim());
  if (!match) return null;
  const tag = match[2] ? match[2].toLowerCase() : null;
  return {
    name: match[1],
    tag,
    actor: tag ? TAG_TO_ACTOR[tag] : 'Patient',
    domain: match[3].toLowerCase(),
  };
}

function normalizeDomain(domain) {
  return String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

function isValidDomainFormat(domain) {
  return DOMAIN_PATTERN.test(domain);
}

function isReservedDomain(domain) {
  return RESERVED_EMAIL_DOMAINS.includes(normalizeDomain(domain));
}

/**
 * Base suggestion for a hospital's email domain, without the uniqueness
 * suffix: "City General Hospital" → "citygen.com".
 */
function suggestEmailDomainBase(name) {
  const words = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !DOMAIN_FILLER_WORDS.has(w));
  let label;
  if (words.length === 0) label = 'hospital';
  else if (words.length === 1 || words.join('').length <= 10)
    label = words.join('');
  else
    label =
      words[0] +
      words
        .slice(1)
        .map((w) => w.slice(0, 3))
        .join('');
  return `${label.slice(0, 12)}.com`;
}

module.exports = {
  EMAIL_PATTERN,
  TAG_TO_ACTOR,
  ACTOR_TO_TAG,
  PLATFORM_EMAIL_DOMAIN,
  RESERVED_EMAIL_DOMAINS,
  parseEmail,
  normalizeDomain,
  isValidDomainFormat,
  isReservedDomain,
  suggestEmailDomainBase,
};
