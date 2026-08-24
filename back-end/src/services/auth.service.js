'use strict';

const {
  userRepository,
  patientRepository,
  organizationRepository,
} = require('../repositories');
const activityService = require('./activity.service');
const organizationService = require('./organization.service');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createSession, destroySession } = require('../store/sessionStore');
const { ROLE_ID_TO_NAME } = require('../utils/roles');

function roleNameFor(user) {
  return ROLE_ID_TO_NAME[user.role_id] || null;
}

function findUserByEmail(email) {
  return userRepository.findByEmail(email);
}

function findPatientForUser(userId) {
  const uid = Number(userId);
  return patientRepository.findOne((p) => p.user_id === uid);
}

function toPublicUser(user) {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
  };
}

function tenantContextFor(user) {
  const organization = organizationRepository.findById(user.organization_id);
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

function login(email, password, requestedOrganizationId) {
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: 'INVALID_CREDENTIALS' };
  }
  if (
    requestedOrganizationId &&
    user.organization_id !== Number(requestedOrganizationId)
  ) {
    return { error: 'WRONG_ORGANIZATION' };
  }
  const organization = organizationRepository.findById(user.organization_id);
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
  const organization = organizationRepository.findById(payload.organization_id);
  if (!organization || organization.status !== 'ACTIVE') {
    return { error: 'INVALID_ORGANIZATION' };
  }
  const primaryHospital = organizationService.primaryHospitalFor(
    organization.organization_id,
  );

  const newUser = userRepository.create({
    name: payload.name,
    email: payload.email,
    password_hash: hashPassword(payload.password),
    role_id: 2, // Patient
    organization_id: organization.organization_id,
    hospital_id: primaryHospital ? primaryHospital.hospital_id : null,
  });

  const patient = patientRepository.create({
    user_id: newUser.user_id,
    uhid: patientRepository.generateUhid(),
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
  const user = userRepository.findById(session.userId);
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
