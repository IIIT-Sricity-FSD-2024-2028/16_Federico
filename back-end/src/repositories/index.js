'use strict';

const BaseRepository = require('./BaseRepository');
const patientRepository = require('./PatientRepository');
const doctorRepository = require('./DoctorRepository');
const wardRepository = require('./WardRepository');
const appointmentRepository = require('./AppointmentRepository');
const preRequestRepository = require('./PreRequestRepository');
const admissionRepository = require('./AdmissionRepository');
const billingRepository = require('./BillingRepository');
const inventoryRepository = require('./InventoryRepository');
const rbacRepository = require('./RbacRepository');
const organizationRepository = require('./OrganizationRepository');
const userRepository = require('./UserRepository');
const activityLogRepository = require('./ActivityLogRepository');

module.exports = {
  BaseRepository,
  patientRepository,
  doctorRepository,
  wardRepository,
  appointmentRepository,
  preRequestRepository,
  admissionRepository,
  billingRepository,
  inventoryRepository,
  rbacRepository,
  organizationRepository,
  userRepository,
  activityLogRepository,
};
