'use strict';

/**
 * Login email convention, mirrored from back-end/src/utils/emailIdentity.js
 * (keep the two in step):
 *
 *   <name>[.<tag>]@<domain>
 *
 * The tag names the portal (.hom .pre .fa .admin .platform; none = Patient).
 * Staff use their hospital's email_domain, so the domain names the hospital;
 * patients keep personal emails and pick their hospital from a list.
 *
 * Dependency-free on purpose: back-end/src/test/frontend_shared.spec.js loads
 * this file by stripping `export` and evaluating it.
 */

export const EMAIL_PATTERN = /^([^\s@]+?)(?:\.(hom|pre|fa|admin|platform))?@([^\s@]+\.[^\s@]+)$/i;

export const TAG_TO_ACTOR = { hom: 'HOM', pre: 'PRE', fa: 'FA', admin: 'Admin', platform: 'PLATFORM' };

export const ACTOR_TO_TAG = { HOM: 'hom', PRE: 'pre', FA: 'fa', Admin: 'admin', PLATFORM: 'platform' };

/** URL slug of each hospital actor's login endpoint: POST /auth/login/:slug. */
export const ACTOR_LOGIN_SLUG = { HOM: 'hom', PRE: 'pre', FA: 'fa', Admin: 'admin', Patient: 'patient' };

export const PLATFORM_EMAIL_DOMAIN = 'federico.com';

export const RESERVED_EMAIL_DOMAINS = [
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

const DOMAIN_FILLER_WORDS = [
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
];

/** { name, tag, actor, domain } for a well-formed address, else null. Untagged → 'Patient'. */
export function parseEmail(email) {
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

/**
 * Who the login page should sign this address in as, given the public
 * organization list (each with email_domain):
 *   { actor: 'PLATFORM' }                     name.platform@federico.com
 *   { actor: 'HOM'|'PRE'|'FA'|'Admin', org }  tagged AND on a hospital's domain
 *   { actor: 'Patient', org|null }            everything else; org is a hint
 *                                             when the domain matches a hospital
 * null when the address isn't a valid email yet.
 */
export function resolveLoginIdentity(email, organizations) {
  const parsed = parseEmail(email);
  if (!parsed) return null;
  const org =
    (organizations || []).find(
      (o) => String(o.email_domain || '').toLowerCase() === parsed.domain,
    ) || null;
  if (parsed.actor === 'PLATFORM' && parsed.domain === PLATFORM_EMAIL_DOMAIN) {
    return { actor: 'PLATFORM', org: null, domain: parsed.domain };
  }
  if (parsed.tag && parsed.actor !== 'PLATFORM' && org) {
    return { actor: parsed.actor, org, domain: parsed.domain };
  }
  return { actor: 'Patient', org, domain: parsed.domain };
}

/** True for an address patients may not register: tagged and on a hospital/platform domain. */
export function isReservedStaffEmail(email, organizations) {
  const identity = resolveLoginIdentity(email, organizations);
  return Boolean(identity && identity.actor !== 'Patient');
}

export function normalizeDomain(domain) {
  return String(domain || '').trim().toLowerCase().replace(/^@/, '');
}

/** null when the domain is usable for a hospital, else the reason. */
export function emailDomainProblem(domain, organizations, exceptOrganizationId) {
  const normalized = normalizeDomain(domain);
  if (!DOMAIN_PATTERN.test(normalized)) return 'Use a domain like yourhospital.com';
  if (RESERVED_EMAIL_DOMAINS.includes(normalized)) {
    return 'Public mail and platform domains cannot be used';
  }
  const owner = (organizations || []).find(
    (o) =>
      String(o.email_domain || '').toLowerCase() === normalized &&
      Number(o.organization_id) !== Number(exceptOrganizationId),
  );
  return owner ? 'Already used by ' + owner.name : null;
}

/**
 * Suggested email domain for a hospital name: "City General Hospital" →
 * "citygen.com". Appends 2, 3, … while the result is taken by `organizations`.
 */
export function suggestEmailDomain(name, organizations) {
  const words = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !DOMAIN_FILLER_WORDS.includes(w));
  let label;
  if (words.length === 0) label = 'hospital';
  else if (words.length === 1 || words.join('').length <= 10) label = words.join('');
  else label = words[0] + words.slice(1).map((w) => w.slice(0, 3)).join('');
  label = label.slice(0, 12);
  const taken = (d) =>
    RESERVED_EMAIL_DOMAINS.includes(d) ||
    (organizations || []).some((o) => String(o.email_domain || '').toLowerCase() === d);
  let domain = label + '.com';
  let suffix = 1;
  while (taken(domain)) domain = label + ++suffix + '.com';
  return domain;
}

/** Letters, digits, dots, dashes and underscores only; no @ or whitespace. */
export function sanitizeEmailName(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
}

/** "rekha" + "pre" + "citygen.com" → "rekha.pre@citygen.com" (null if incomplete). */
export function buildTaggedEmail(name, tag, domain) {
  const clean = sanitizeEmailName(name).replace(/^[.]+|[.]+$/g, '');
  if (!clean || !tag || !domain) return null;
  return clean + '.' + tag + '@' + domain;
}

/** Display name of each portal, for the login page's "Signing in to" chip. */
export const PORTAL_LABEL = {
  HOM: 'HOM portal',
  PRE: 'PRE portal',
  FA: 'Finance (FA) portal',
  Admin: 'Admin portal',
  Patient: 'Patient portal',
  PLATFORM: 'Federico platform console',
};
