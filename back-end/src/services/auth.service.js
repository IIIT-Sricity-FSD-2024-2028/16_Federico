'use strict';

const dataStore = require('../store/dataStore');
const patientService = require('./patient.service');
const activityService = require('./activity.service');
const organizationService = require('./organization.service');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createSession, destroySession } = require('../store/sessionStore');

const ROLE_ID_TO_NAME = { 1: 'HOM', 2: 'Patient', 3: 'FA', 4: 'PRE' };

function roleNameFor(user) {
  return ROLE_ID_TO_NAME[user.role_id] || null;
}

function findUserByEmail(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  return (
    dataStore.users.find(
      (u) => u.email && u.email.toLowerCase() === normalized,
    ) || null
  );
}

function findPatientForUser(userId) {
  return dataStore.patients.find((p) => p.user_id === userId) || null;
}

function toPublicUser(user) {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
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
  const enabledModules = organizationService.enabledModulesFor(
    organization.organization_id,
  );
  return {
    organization_id: organization.organization_id,
    hospital_id: user.hospital_id || null,
    organization_name: organization.name,
    branding: organization.branding,
    enabled_modules: enabledModules,
  };
}

/**
 * `requestedOrganizationId`: optional. The marketplace/login flow lets a
 * patient pick an organization before authenticating (tasks.md §11); when
 * present it's cross-checked against the resolved account's actual
 * organization so a patient can't be logged into an org their account
 * doesn't belong to. Staff accounts (who only ever belong to one org)
 * simply have it ignored if omitted.
 */
function login(email, password, requestedOrganizationId) {
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: 'INVALID_CREDENTIALS' };
  }
  if (
    requestedOrganizationId &&
    user.organization_id !== requestedOrganizationId
  ) {
    return { error: 'WRONG_ORGANIZATION' };
  }
  const organization = organizationService.findById(user.organization_id);
  if (!organization || organization.status !== 'ACTIVE') {
    return { error: 'ORGANIZATION_INACTIVE' };
  }

  const role = roleNameFor(user);
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

function signup(payload) {
  if (findUserByEmail(payload.email)) {
    return { error: 'EMAIL_TAKEN' };
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
      dataStore.users.length > 0
        ? Math.max(...dataStore.users.map((u) => u.user_id)) + 1
        : 101,
    name: payload.name,
    email: payload.email,
    password_hash: hashPassword(payload.password),
    role_id: 2, // Patient
    organization_id: organization.organization_id,
    hospital_id: primaryHospital ? primaryHospital.hospital_id : null,
    created_at: new Date().toISOString(),
  };
  dataStore.users.push(newUser);

  const patient = patientService.create({
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
  });

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

module.exports = {
  login,
  signup,
  me,
  logout,
  findUserByEmail,
  findPatientForUser,
  roleNameFor,
  tenantContextFor,
};
