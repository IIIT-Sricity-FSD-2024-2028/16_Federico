'use strict';

const dataStore = require('../store/dataStore');

function findAll() {
  return dataStore.appointments;
}

function findOne(id) {
  return dataStore.appointments.find((a) => a.appointment_id === id) || null;
}

function create(appointment) {
  const newApt = {
    appointment_id:
      dataStore.appointments.length > 0
        ? Math.max(...dataStore.appointments.map((a) => a.appointment_id)) + 1
        : 601,
    created_at: new Date().toISOString(),
    ...appointment,
  };
  dataStore.appointments.push(newApt);
  return newApt;
}

function update(id, patch) {
  const apt = findOne(id);
  if (!apt) return null;
  Object.assign(apt, patch);
  return apt;
}

module.exports = { findAll, findOne, create, update };
