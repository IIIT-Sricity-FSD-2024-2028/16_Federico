'use strict';

const BaseRepository = require('./BaseRepository');

class PreRequestRepository extends BaseRepository {
  constructor() {
    super('preRequests', 'pre_request_id');
  }

  findByPatient(patientId) {
    const pid = Number(patientId);
    return this.findAll((r) => r.patient_id === pid);
  }

  findByStatus(status) {
    const s = String(status).toUpperCase();
    return this.findAll((r) => r.status === s);
  }

  findByBed(bedId) {
    const bid = Number(bedId);
    return this.findOne((r) => r.bed_id === bid && ['ADMITTED', 'DISCHARGE_REQUESTED', 'DISCHARGE_APPROVED'].includes(r.status));
  }
}

module.exports = new PreRequestRepository();
