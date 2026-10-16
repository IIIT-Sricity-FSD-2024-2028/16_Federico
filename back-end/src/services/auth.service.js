'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');
const patientService = require('./patient.service');
const activityService = require('./activity.service');
const organizationService = require('./organization.service');
const entitlementService = require('./entitlement.service');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createSession, destroySession } = require('../store/sessionStore');
const { ROLE_ID_TO_NAME } = require('../utils/roles');
const { parseEmail, PLATFORM_EMAIL_DOMAIN } = require('../utils/emailIdentity');

function roleNameFor(user) {
  return ROLE_ID_TO_NAME[user.role_id] || null;
}

function findUserByEmail(email, organizationId) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  if (organizationId !== undefined && organizationId !== null) {
    const orgId = Number(organizationId);
    return (
      dataStore.users.find(
        (u) =>
          u.email &&
          u.email.toLowerCase() === normalized &&
          u.organization_id === orgId,
      ) || null
    );
  }
  return (
    dataStore.users.find(
      (u) => u.email && u.email.toLowerCase() === normalized,
    ) || null
  );
}

function findUsersByEmail(email) {
  if (!email) return [];
  const normalized = String(email).trim().toLowerCase();
  return dataStore.users.filter(
    (u) => u.email && u.email.toLowerCase() === normalized,
  );
}

function findPatientForUser(userId) {
  const uid = Number(userId);
  return dataStore.patients.find((p) => p.user_id === uid) || null;
}

function toPublicUser(user) {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    organization_id:
      user.organization_id != null ? Number(user.organization_id) : null,
    hospital_id:
      user.hospital_id != null ? Number(user.hospital_id) : null,
  };
}

/**
 * Tenant Context Service (tasks.md §12) — everything the frontend needs to
 * re-skin itself for this organization, returned alongside every login/
 * signup/me response so no separate round-trip is needed to boot the app.
 */
function tenantContextFor(user) {
  const organization = organizationService.findById(user.organization_id);
  if (!organization) return null;
  const entitlements = entitlementService.entitlementsFor(
    organization.organization_id,
  );
  return {
    organization_id: organization.organization_id,
    hospital_id: user.hospital_id || null,
    organization_name: organization.name,
    email_domain: organization.email_domain || null,
    branding: organization.branding,
    specialties: organization.specialties || [],
    resources: entitlements.resources,
  };
}

/**
 * `requestedOrganizationId`: optional. The marketplace/login flow lets a
 * patient pick an organization before authenticating (tasks.md §11); when
 * present it's cross-checked against the resolved account's actual
 * organization so a patient can't be logged into an org their account
 * doesn't belong to. Staff accounts (who only ever belong to one org)
 * simply have it ignored if omitted.
 *
 * `expectedRole`: optional. Set by the per-actor endpoints
 * (POST /auth/login/:actor) so an account can only sign in through its own
 * portal. Checked after the password, so a wrong guess never reveals a role.
 */
function login(email, password, requestedOrganizationId, expectedRole) {
  let user = null;

  if (requestedOrganizationId !== undefined && requestedOrganizationId !== null) {
    user = findUserByEmail(email, requestedOrganizationId);
    if (!user) {
      const anyUser = findUserByEmail(email);
      if (anyUser && verifyPassword(password, anyUser.password_hash)) {
        return { error: 'WRONG_ORGANIZATION' };
      }
      return { error: 'INVALID_CREDENTIALS' };
    }
    if (!verifyPassword(password, user.password_hash)) {
      return { error: 'INVALID_CREDENTIALS' };
    }
  } else {
    // When no organization is specified upfront, check candidate accounts:
    const candidateUsers = findUsersByEmail(email);
    if (!candidateUsers || candidateUsers.length === 0) {
      return { error: 'INVALID_CREDENTIALS' };
    }

    // Filter to active accounts whose password matches:
    const validMatches = candidateUsers.filter(
      (u) => u.is_active !== false && verifyPassword(password, u.password_hash),
    );

    if (validMatches.length === 0) {
      return { error: 'INVALID_CREDENTIALS' };
    }

    if (validMatches.length === 1) {
      user = validMatches[0];
    } else {
      // Patient is registered across multiple hospitals with matching credentials.
      // Return organization choices so the patient can choose which hospital to access:
      const organizations = validMatches.map((u) => {
        const org = organizationService.findById(u.organization_id);
        return {
          organization_id: u.organization_id,
          name: org ? org.name : `Hospital ${u.organization_id}`,
          branding: org ? org.branding : null,
        };
      });
      return {
        requiresOrganizationSelection: true,
        organizations,
      };
    }
  }

  if (user.is_active === false) {
    return { error: 'ACCOUNT_INACTIVE' };
  }
  const organization = organizationService.findById(user.organization_id);
  if (!organization || organization.status !== 'ACTIVE') {
    return { error: 'ORGANIZATION_INACTIVE' };
  }

  const role = roleNameFor(user);
  if (expectedRole && role !== expectedRole) {
    return { error: 'WRONG_PORTAL' };
  }
  const patient = role === 'Patient' ? findPatientForUser(user.user_id) : null;
  const token = createSession({
    userId: user.user_id,
    role,
    patientId: patient ? patient.patient_id : null,
    organizationId: user.organization_id,
    hospitalId: user.hospital_id,
  });

  activityService.log(
    'info',
    `${role} login: ${user.name}`,
    { userId: user.user_id },
    user.organization_id,
  );

  return {
    token,
    role,
    user: toPublicUser(user),
    patient: patient || null,
    tenant: tenantContextFor(user),
  };
}

/**
 * True for an address the unified login page would route to a staff or
 * platform portal: tagged (.hom/.pre/.fa/.admin/.platform) AND on a hospital's
 * or the platform's domain. Patients can't register those. A tag on any other
 * domain (mohammed.fa@gmail.com) is just a personal email.
 */
function isReservedStaffEmail(email) {
  const parsed = parseEmail(email);
  if (!parsed || !parsed.tag) return false;
  return (
    parsed.domain === PLATFORM_EMAIL_DOMAIN ||
    Boolean(organizationService.findByEmailDomain(parsed.domain))
  );
}

function signup(payload) {
  if (findUserByEmail(payload.email, payload.organization_id)) {
    return { error: 'EMAIL_TAKEN' };
  }
  if (isReservedStaffEmail(payload.email)) {
    return { error: 'EMAIL_RESERVED' };
  }
  const organization = organizationService.findById(payload.organization_id);
  if (!organization || organization.status !== 'ACTIVE') {
    return { error: 'INVALID_ORGANIZATION' };
  }
  const primaryHospital = organizationService.primaryHospitalFor(
    organization.organization_id,
  );

  const newUser = {
    user_id:
      maxId(dataStore.users, 'user_id') + 1 || 101,
    name: payload.name,
    email: payload.email,
    password_hash: hashPassword(payload.password),
    demo_password: payload.password,
    role_id: 2, // Patient
    organization_id: organization.organization_id,
    hospital_id: primaryHospital ? primaryHospital.hospital_id : null,
    created_at: new Date().toISOString(),
  };
  dataStore.users.push(newUser);
  registerDemoPassword(payload.email, payload.password);

  // Built directly here (not via patientService.create()) so the fuller
  // self-signup field set — user_id, emergency_contact_name/phone — is
  // always persisted, regardless of the narrower field allowlist the
  // general PRE-facing patient.service.js#create() applies for walk-in
  // registration payloads.
  const patient = {
    patient_id:
      maxId(dataStore.patients, 'patient_id') + 1 || 201,
    user_id: newUser.user_id,
    uhid: patientService.generateUhid(),
    name: payload.name,
    phone: payload.phone,
    dob: payload.dob,
    gender: payload.gender,
    blood_group: payload.blood_group,
    address: payload.address,
    emergency_contact_name: payload.emergency_contact_name,
    emergency_contact_phone: payload.emergency_contact_phone,
    organization_id: organization.organization_id,
    hospital_id: newUser.hospital_id,
    created_at: new Date().toISOString(),
  };
  dataStore.patients.push(patient);

  const token = createSession({
    userId: newUser.user_id,
    role: 'Patient',
    patientId: patient.patient_id,
    organizationId: organization.organization_id,
    hospitalId: newUser.hospital_id,
  });

  activityService.log(
    'success',
    `New patient registered: ${patient.name} (${patient.uhid})`,
    { patientId: patient.patient_id },
    organization.organization_id,
  );

  return {
    token,
    role: 'Patient',
    user: toPublicUser(newUser),
    patient,
    tenant: tenantContextFor(newUser),
  };
}

function me(session) {
  const user =
    dataStore.users.find((u) => u.user_id === session.userId) || null;
  if (!user) return null;
  const patient =
    session.role === 'Patient' ? findPatientForUser(user.user_id) : null;
  return {
    role: session.role,
    user: toPublicUser(user),
    patient,
    tenant: tenantContextFor(user),
  };
}

function logout(token) {
  return destroySession(token);
}

const KNOWN_DEMO_PASSWORDS = {
  'admin.hom@citygen.com': 'Hom@123',
  'arjun.k@hosp.com': 'Hamiz@123',
  'priyanka.n@hosp.com': 'Salma@123',
  'rohan.m@hosp.com': 'John@123',
  'rekha.pre@citygen.com': 'Pre@123',
  'farah.fa@citygen.com': 'Fa@123',
  'billing.assist.pre@citygen.com': 'Assist@123',
  'owner.admin@citygen.com': 'Owner@123',
  'admin.hom@apollo.com': 'Apollo@123',
  'priya.pre@apollo.com': 'Apollo@123',
  'rajesh.fa@apollo.com': 'Apollo@123',
  'meera@apollo.hosp.com': 'Apollo@123',
  'owner.admin@apollo.com': 'Apollo@123',
  'super.platform@federico.com': 'Federico@Platform123',
};

const ROLE_PURPOSE = {
  Admin: 'Hospital Owner — Department configuration, staff management, and system administration',
  HOM: 'Hospital Operations Manager — Bed matrix, occupancy, inventory usage, and discharge approvals',
  PRE: 'Patient Relational Executive — Front desk, appointments, triage queues, and doctor directory',
  FA: 'Finance Associate — Billing ledgers, charge approvals, insurance deductions, and settlements',
  Patient: 'Patient Portal — Book OPD appointments, view admissions, and check itemized bills',
  Platform: 'Platform Super User — Tenant hospital provisioning, subscription management, and MRR analytics',
};

function registerDemoPassword(email, password) {
  if (email && password) {
    const key = String(email).trim().toLowerCase();
    KNOWN_DEMO_PASSWORDS[key] = String(password);
    KNOWN_DEMO_PASSWORDS[String(email).trim()] = String(password);
  }
}

function getDemoAccounts() {
  const activeOrgs = dataStore.organizations.filter((o) => o.status === 'ACTIVE');
  const orgMap = {};

  activeOrgs.forEach((org) => {
    const orgUsers = dataStore.users.filter(
      (u) => u.organization_id === org.organization_id && u.is_active !== false,
    );
    const byRole = {
      Admin: [],
      HOM: [],
      PRE: [],
      FA: [],
      Patient: [],
    };

    orgUsers.forEach((u) => {
      const roleName = roleNameFor(u);
      if (byRole[roleName]) {
        const emailLower = (u.email || '').toLowerCase();
        const pwd =
          u.demo_password ||
          KNOWN_DEMO_PASSWORDS[emailLower] ||
          KNOWN_DEMO_PASSWORDS[u.email] ||
          'Demo@123';
        const purpose =
          u.email === 'billing.assist.pre@citygen.com'
            ? 'Custom Role Demo — Delegated billing & front-desk operational access'
            : ROLE_PURPOSE[roleName] || roleName;
        byRole[roleName].push({
          user_id: u.user_id,
          email: u.email,
          displayName: u.name,
          role: roleName,
          purpose,
          password: pwd,
          organization_id: org.organization_id,
        });
      }
    });

    orgMap[org.organization_id] = {
      organization_id: org.organization_id,
      name: org.name,
      roles: byRole,
    };
  });

  return {
    organizations: orgMap,
    platform: {
      role: 'Platform',
      email: 'super.platform@federico.com',
      password: 'Federico@Platform123',
      displayName: 'Platform Super User',
      purpose: ROLE_PURPOSE.Platform,
    },
  };
}

function changePassword(userId, newPassword, currentPassword = null) {
  const uid = Number(userId);
  const user = dataStore.users.find((u) => u.user_id === uid);
  if (!user) {
    const notFound = new Error('User not found');
    notFound.status = 404;
    throw notFound;
  }
  if (currentPassword && user.password_hash) {
    if (!verifyPassword(currentPassword, user.password_hash)) {
      const err = new Error('Current password is incorrect');
      err.status = 400;
      throw err;
    }
  }
  user.password_hash = hashPassword(newPassword);
  user.demo_password = newPassword;
  registerDemoPassword(user.email, newPassword);
  return { success: true, message: 'Password updated successfully' };
}

module.exports = {
  login,
  signup,
  me,
  logout,
  findUserByEmail,
  findUsersByEmail,
  findPatientForUser,
  isReservedStaffEmail,
  roleNameFor,
  tenantContextFor,
  getDemoAccounts,
  changePassword,
  toPublicUser,
  registerDemoPassword,
};
