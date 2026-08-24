'use strict';

const { Router } = require('express');
const appController = require('../controllers/app.controller');

// Mounted in the same order AppModule imported its feature modules:
// DataModule, DoctorModule, PatientModule, WardModule, InventoryModule,
// BillingModule, RequestModule, AdmissionModule.
const dataRoutes = require('./data.routes');
const doctorRoutes = require('./doctor.routes');
const patientRoutes = require('./patient.routes');
const wardRoutes = require('./ward.routes');
const inventoryRoutes = require('./inventory.routes');
const billingRoutes = require('./billing.routes');
const appointmentRoutes = require('./appointment.routes');
const requestRoutes = require('./request.routes');
const admissionRoutes = require('./admission.routes');

// Phase 2 — backend-as-source-of-truth additions.
const authRoutes = require('./auth.routes');
const preRequestRoutes = require('./preRequest.routes');
const activityRoutes = require('./activity.routes');

// Multi-tenancy additions — Platform Super User, Organization Marketplace,
// dynamic RBAC (tasks.md).
const platformRoutes = require('./platform.routes');
const marketplaceRoutes = require('./marketplace.routes');
const rbacRoutes = require('./rbac.routes');

const router = Router();

router.get('/', appController.getHello);

router.use('/data', dataRoutes);
router.use('/doctor', doctorRoutes);
router.use('/patient', patientRoutes);
router.use('/ward', wardRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/billing', billingRoutes);
router.use('/appointment', appointmentRoutes);
router.use('/request', requestRoutes);
router.use('/admission', admissionRoutes);

router.use('/auth', authRoutes);
router.use('/pre-requests', preRequestRoutes);
router.use('/activity-log', activityRoutes);

router.use('/platform', platformRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/rbac', rbacRoutes);

module.exports = router;
