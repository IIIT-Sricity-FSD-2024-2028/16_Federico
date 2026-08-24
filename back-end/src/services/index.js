'use strict';

/**
 * @module services
 * Central Domain Services Export Registry
 */

const activityService = require('./activity.service');
const admissionService = require('./admission.service');
const appService = require('./app.service');
const appointmentService = require('./appointment.service');
const authService = require('./auth.service');
const billingService = require('./billing.service');
const dataService = require('./data.service');
const doctorService = require('./doctor.service');
const inventoryService = require('./inventory.service');
const organizationService = require('./organization.service');
const patientService = require('./patient.service');
const platformActivityService = require('./platformActivity.service');
const platformAuthService = require('./platformAuth.service');
const preRequestService = require('./preRequest.service');
const provisioningService = require('./provisioning.service');
const rbacService = require('./rbac.service');
const requestService = require('./request.service');
const subscriptionService = require('./subscription.service');
const subscriptionPlanService = require('./subscriptionPlan.service');
const wardService = require('./ward.service');

module.exports = {
  activityService,
  admissionService,
  appService,
  appointmentService,
  authService,
  billingService,
  dataService,
  doctorService,
  inventoryService,
  organizationService,
  patientService,
  platformActivityService,
  platformAuthService,
  preRequestService,
  provisioningService,
  rbacService,
  requestService,
  subscriptionService,
  subscriptionPlanService,
  wardService,
};
