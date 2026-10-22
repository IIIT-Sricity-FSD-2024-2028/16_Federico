'use strict';

const dataStore = require('../store/dataStore');
const { maxId } = require('../utils/maxId');

function enrichPatientWithUser(patient) {
  if (!patient) return null;
  if (!patient.email && patient.user_id) {
    const user = dataStore.users.find((u) => u.user_id === patient.user_id);
    if (user && user.email) {
      patient.email = user.email;
    }
  }
  return patient;
}

function findAll() {
  dataStore.patients.forEach(enrichPatientWithUser);
  return dataStore.patients;
}

// NOTE: id arrives as a string or number. A purely numeric id matches by
// numeric patient_id; otherwise it falls back to case-insensitive uhid match.
function findOne(id) {
  if (id == null) return null;
  const strId = String(id).trim();
  const numId = Number(strId);
  if (!Number.isNaN(numId) && String(numId) === strId) {
    const byId = dataStore.patients.find((p) => p.patient_id === numId);
    if (byId) return enrichPatientWithUser(byId);
  }
  const normalized = strId.toUpperCase();
  const byUhid = dataStore.patients.find(
    (p) => String(p.uhid || '').toUpperCase() === normalized,
  ) || null;
  return enrichPatientWithUser(byUhid);
}

function findByUserId(userId) {
  if (userId == null) return null;
  const uid = Number(userId);
  const found = dataStore.patients.find((p) => p.user_id === uid) || null;
  return enrichPatientWithUser(found);
}

function generateUhid() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let uhid;
  do {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    uhid = `UHID-${code}`;
  } while (dataStore.patients.some((p) => p.uhid === uhid));
  return uhid;
}

const trimOrNull = (val) => (typeof val === 'string' ? val.trim() : (val || null));

function resolvePatientName(data = {}) {
  if (typeof data.name === 'string' && data.name.trim()) return data.name.trim();
  const first = data.first_name || data.firstName || '';
  const last = data.last_name || data.lastName || '';
  const combined = [first, last].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
  return combined || data.name || null;
}

function create(patient) {
  const newPatient = {
    patient_id: maxId(dataStore.patients, 'patient_id', 201) + 1,
    user_id: patient.user_id ? Number(patient.user_id) : null,
    uhid: patient.uhid ? patient.uhid.trim().toUpperCase() : generateUhid(),
    name: resolvePatientName(patient),
    email: typeof patient.email === 'string' ? patient.email.trim().toLowerCase() : null,
    phone: trimOrNull(patient.phone),
    alternate_phone: trimOrNull(patient.alternate_phone),
    dob: patient.dob || null,
    gender: patient.gender || null,
    blood_group: trimOrNull(patient.blood_group),
    address: trimOrNull(patient.address),
    emergency_contact_name: trimOrNull(patient.emergency_contact_name),
    emergency_contact_phone: trimOrNull(patient.emergency_contact_phone),
    organization_id: patient.organization_id ? Number(patient.organization_id) : null,
    hospital_id: patient.hospital_id ? Number(patient.hospital_id) : null,
    created_at: new Date().toISOString(),
  };
  dataStore.patients.push(newPatient);
  return newPatient;
}

function update(id, patch) {
  const patient = findOne(id);
  if (!patient) return null;
  const {
    patient_id: _pid,
    organization_id: _oid,
    hospital_id: _hid,
    created_at: _cat,
    uhid: _uhid,
    ...safePatch
  } = patch;

  const resolved = resolvePatientName(safePatch);
  if (resolved) safePatch.name = resolved;
  delete safePatch.first_name;
  delete safePatch.last_name;
  delete safePatch.firstName;
  delete safePatch.lastName;

  ['name', 'phone', 'alternate_phone', 'blood_group', 'address', 'emergency_contact_name', 'emergency_contact_phone'].forEach((k) => {
    if (typeof safePatch[k] === 'string') safePatch[k] = safePatch[k].trim();
  });
  if (typeof safePatch.email === 'string') {
    safePatch.email = safePatch.email.trim().toLowerCase();
    let user = patient.user_id ? dataStore.users.find((u) => u.user_id === patient.user_id) : null;
    if (!user && patient.email) {
      user = dataStore.users.find((u) => u.email === patient.email);
      if (user && !patient.user_id) patient.user_id = user.user_id;
    }
    if (user) user.email = safePatch.email;
  }
  if (safePatch.name) {
    const user = patient.user_id ? dataStore.users.find((u) => u.user_id === patient.user_id) : null;
    if (user) user.name = safePatch.name;
  }

  Object.assign(patient, safePatch);
  return patient;
}

function remove(id) {
  const patient = findOne(id);
  if (!patient) return { deleted: false };
  const hasActiveAdmission = (dataStore.admissions || []).some(
    (a) => a.patient_id === patient.patient_id && a.status === 'ADMITTED',
  );
  if (hasActiveAdmission) {
    const err = new Error(`Cannot delete patient #${patient.patient_id} with active admission`);
    err.statusCode = 409;
    throw err;
  }
  const initialLen = dataStore.patients.length;
  dataStore.patients = dataStore.patients.filter(
    (p) => p.patient_id !== patient.patient_id,
  );
  return { deleted: dataStore.patients.length < initialLen };
}

// Insurance
function findAllInsurances() {
  return dataStore.patientInsurances;
}

function findInsuranceByPatient(patient_id) {
  const pid = Number(patient_id);
  return dataStore.patientInsurances.filter((i) => i.patient_id === pid);
}

function findCurrentInsurance(patientId) {
  const list = findInsuranceByPatient(patientId);
  if (!list || !list.length) return null;
  return list.reduce((latest, ins) =>
    ins.insurance_id > latest.insurance_id ? ins : latest,
  );
}

function createInsurance(insurance) {
  const patient = dataStore.patients.find((p) => p.patient_id === Number(insurance.patient_id));
  const orgId = insurance.organization_id
    ? Number(insurance.organization_id)
    : (patient?.organization_id ? Number(patient.organization_id) : null);
  const hospId = insurance.hospital_id
    ? Number(insurance.hospital_id)
    : (patient?.hospital_id ? Number(patient.hospital_id) : null);

  const newIns = {
    insurance_id: maxId(dataStore.patientInsurances, 'insurance_id', 301) + 1,
    patient_id: Number(insurance.patient_id),
    provider_name: typeof insurance.provider_name === 'string' ? insurance.provider_name.trim() : insurance.provider_name,
    policy_number: typeof insurance.policy_number === 'string' ? insurance.policy_number.trim() : insurance.policy_number,
    member_id: insurance.member_id || `MEM-${Number(insurance.patient_id)}`,
    coverage_type: insurance.coverage_type || 'Comprehensive',
    coverage_limit: Number(insurance.coverage_limit) || 0,
    copay_percentage: Number(insurance.copay_percentage) || 0,
    valid_from: insurance.valid_from || new Date().toISOString().slice(0, 10),
    valid_to:
      insurance.valid_to ||
      insurance.valid_till ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    organization_id: orgId,
    hospital_id: hospId,
    card_front_url: insurance.card_front_url || null,
    card_back_url: insurance.card_back_url || null,
    created_at: new Date().toISOString(),
  };
  dataStore.patientInsurances.push(newIns);
  return newIns;
}

module.exports = {
  findAll,
  findOne,
  findByUserId,
  create,
  update,
  remove,
  findAllInsurances,
  findInsuranceByPatient,
  findCurrentInsurance,
  createInsurance,
  generateUhid,
};
