'use strict';

const dataStore = require('../store/dataStore');

// WARD
function findAllWards() {
  return dataStore.wards;
}

function createWard(ward) {
  const newWard = {
    ward_id: dataStore.wards.length > 0 ? Math.max(...dataStore.wards.map((w) => w.ward_id)) + 1 : 1,
    ...ward,
  };
  dataStore.wards.push(newWard);
  return newWard;
}

// BED
function findAllBeds() {
  return dataStore.beds;
}

function findBedsByWard(ward_id) {
  return dataStore.beds.filter((b) => b.ward_id === ward_id);
}

function createBed(bed) {
  const newBed = {
    bed_id: dataStore.beds.length > 0 ? Math.max(...dataStore.beds.map((b) => b.bed_id)) + 1 : 11,
    ...bed,
  };
  dataStore.beds.push(newBed);
  return newBed;
}

function updateBedStatus(bed_id, status) {
  const bed = dataStore.beds.find((b) => b.bed_id === bed_id);
  if (!bed) return null;
  bed.status = status;
  return bed;
}

module.exports = { findAllWards, createWard, findAllBeds, findBedsByWard, createBed, updateBedStatus };
