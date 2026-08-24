'use strict';

const BaseRepository = require('./BaseRepository');

class AppointmentRepository extends BaseRepository {
  constructor() {
    super('appointments', 'appointment_id');
  }

  findByPatient(patientId) {
    const pid = Number(patientId);
    return this.findAll((a) => a.patient_id === pid);
  }

  findByDoctor(doctorId) {
    const did = Number(doctorId);
    return this.findAll((a) => a.doctor_id === did);
  }
}

module.exports = new AppointmentRepository();
