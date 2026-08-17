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
const requestRoutes = require('./request.routes');
const admissionRoutes = require('./admission.routes');

const router = Router();

router.get('/', appController.getHello);

router.use('/data', dataRoutes);
router.use('/doctor', doctorRoutes);
router.use('/patient', patientRoutes);
router.use('/ward', wardRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/billing', billingRoutes);
router.use('/appointment', requestRoutes);
router.use('/admission', admissionRoutes);

module.exports = router;
