'use strict';

const BaseRepository = require('./BaseRepository');

class WardRepository extends BaseRepository {
  constructor() {
    super('wards', 'ward_id');
    this.bedRepo = new BaseRepository('beds', 'bed_id');
    this.bedRequestRepo = new BaseRepository('bedRequests', 'bed_request_id');
    this.emergencyRepo = new BaseRepository('emergencyNotifications', 'notification_id');
  }

  // Beds methods
  findAllBeds(predicate = null) {
    return this.bedRepo.findAll(predicate);
  }

  findBedsByWard(wardId) {
    const wid = Number(wardId);
    return this.bedRepo.findAll((b) => b.ward_id === wid);
  }

  findBedById(bedId) {
    return this.bedRepo.findById(bedId);
  }

  createBed(bed) {
    return this.bedRepo.create(bed);
  }

  updateBed(bedId, patch) {
    return this.bedRepo.update(bedId, patch);
  }

  deleteBed(bedId) {
    return this.bedRepo.delete(bedId);
  }

  // Bed requests methods
  findAllBedRequests(predicate = null) {
    return this.bedRequestRepo.findAll(predicate);
  }

  findBedRequestById(id) {
    return this.bedRequestRepo.findById(id);
  }

  createBedRequest(req) {
    return this.bedRequestRepo.create(req);
  }

  updateBedRequest(id, patch) {
    return this.bedRequestRepo.update(id, patch);
  }

  deleteBedRequest(id) {
    return this.bedRequestRepo.delete(id);
  }

  // Emergency notifications
  findAllEmergencies(predicate = null) {
    return this.emergencyRepo.findAll(predicate);
  }

  findEmergencyById(id) {
    return this.emergencyRepo.findById(id);
  }

  createEmergency(notification) {
    return this.emergencyRepo.create(notification);
  }

  updateEmergency(id, patch) {
    return this.emergencyRepo.update(id, patch);
  }
}

module.exports = new WardRepository();
