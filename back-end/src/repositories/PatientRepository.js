'use strict';

const BaseRepository = require('./BaseRepository');

class PatientRepository extends BaseRepository {
  constructor() {
    super('patients', 'patient_id');
    this.insuranceRepo = new BaseRepository('patientInsurances', 'insurance_id');
  }

  generateUhid() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const candidate = `UHID-${code}`;
    const exists = this._collection.some((p) => p.uhid === candidate);
    if (exists) return this.generateUhid();
    return candidate;
  }

  findByUhid(uhid) {
    if (!uhid) return null;
    const normalized = String(uhid).trim().toUpperCase();
    const found = this._collection.find(
      (p) => String(p.uhid || '').toUpperCase() === normalized,
    );
    return found ? { ...found } : null;
  }

  findByIdOrUhid(idOrUhid) {
    if (idOrUhid === undefined || idOrUhid === null) return null;
    const asNum = Number(idOrUhid);
    if (!Number.isNaN(asNum) && String(asNum) === String(idOrUhid).trim()) {
      const byId = this.findById(asNum);
      if (byId) return byId;
    }
    return this.findByUhid(idOrUhid);
  }

  // Insurance relations
  findAllInsurances(predicate = null) {
    return this.insuranceRepo.findAll(predicate);
  }

  findInsuranceByPatient(patientId) {
    const pid = Number(patientId);
    return this.insuranceRepo.findOne((ins) => ins.patient_id === pid);
  }

  createInsurance(insurance) {
    return this.insuranceRepo.create(insurance);
  }

  updateInsurance(insuranceId, patch) {
    return this.insuranceRepo.update(insuranceId, patch);
  }

  deleteInsurance(insuranceId) {
    return this.insuranceRepo.delete(insuranceId);
  }
}

module.exports = new PatientRepository();
