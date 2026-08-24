'use strict';

const BaseRepository = require('./BaseRepository');

class AdmissionRepository extends BaseRepository {
  constructor() {
    super('admissions', 'admission_id');
  }

  findByPatient(patientId) {
    const pid = Number(patientId);
    return this.findAll((a) => a.patient_id === pid);
  }

  findByBed(bedId) {
    const bid = Number(bedId);
    return this.findOne((a) => a.bed_id === bid && a.status !== 'DISCHARGED');
  }
}

module.exports = new AdmissionRepository();
