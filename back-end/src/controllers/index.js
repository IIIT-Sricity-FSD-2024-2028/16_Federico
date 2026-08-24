'use strict';

/**
 * @module controllers
 * Central Controller Export Registry
 */

const activityController = require('./activity.controller');
const admissionController = require('./admission.controller');
const appController = require('./app.controller');
const appointmentController = require('./appointment.controller');
const authController = require('./auth.controller');
const billingController = require('./billing.controller');
const dataController = require('./data.controller');
const doctorController = require('./doctor.controller');
const inventoryController = require('./inventory.controller');
const marketplaceController = require('./marketplace.controller');
const patientController = require('./patient.controller');
const platformController = require('./platform.controller');
const preRequestController = require('./preRequest.controller');
const rbacController = require('./rbac.controller');
const requestController = require('./request.controller');
const wardController = require('./ward.controller');

module.exports = {
  activityController,
  admissionController,
  appController,
  appointmentController,
  authController,
  billingController,
  dataController,
  doctorController,
  inventoryController,
  marketplaceController,
  patientController,
  platformController,
  preRequestController,
  rbacController,
  requestController,
  wardController,
};
