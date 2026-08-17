'use strict';

const dataStore = require('../store/dataStore');

function findAll() {
  return dataStore.admissions;
}

function findOne(id) {
  return dataStore.admissions.find((a) => a.admission_id === id) || null;
}

function create(admission) {
  const newAdmission = {
    admission_id:
      dataStore.admissions.length > 0
        ? Math.max(...dataStore.admissions.map((a) => a.admission_id)) + 1
        : 701,
    admit_time: admission.admit_time || new Date().toISOString(),
    ...admission,
  };
  dataStore.admissions.push(newAdmission);
  return newAdmission;
}

function update(id, patch) {
  const admission = findOne(id);
  if (!admission) return null;
  Object.assign(admission, patch);
  return admission;
}

module.exports = { findAll, findOne, create, update };
