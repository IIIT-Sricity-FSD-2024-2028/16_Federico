'use strict';

const BaseRepository = require('./BaseRepository');

class DoctorRepository extends BaseRepository {
  constructor() {
    super('doctors', 'doctor_id');
    this.availabilitiesRepo = new BaseRepository('doctorAvailabilities', 'availability_id');
  }

  findAllAvailabilities(predicate = null) {
    return this.availabilitiesRepo.findAll(predicate);
  }

  findAvailabilitiesByDoctor(doctorId) {
    const docId = Number(doctorId);
    return this.availabilitiesRepo.findAll((a) => a.doctor_id === docId);
  }

  findAvailabilityById(availabilityId) {
    return this.availabilitiesRepo.findById(availabilityId);
  }

  createAvailability(availability) {
    return this.availabilitiesRepo.create(availability);
  }

  updateAvailability(availabilityId, patch) {
    return this.availabilitiesRepo.update(availabilityId, patch);
  }

  deleteAvailability(availabilityId) {
    return this.availabilitiesRepo.delete(availabilityId);
  }
}

module.exports = new DoctorRepository();
