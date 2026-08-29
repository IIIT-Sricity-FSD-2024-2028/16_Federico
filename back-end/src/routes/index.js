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

// File Upload (Evaluation Criteria: File upload middleware).
const uploadRoutes = require('./upload.routes');

// Usage-based billing — per-hit metering hook (route wiring, NOT middleware)
// and the tenant-facing "my usage" view.
const { meter } = require('../metering/meter');
const usageRoutes = require('./usage.routes');

const router = Router();

router.get('/', appController.getHello);

router.use('/data', dataRoutes);
router.use('/doctor', doctorRoutes); // core directory CRUD — not metered
router.use('/patient', patientRoutes); // core CRUD + INSURANCE (billed flat) — not metered
router.use('/ward', meter('ADMISSIONS'), wardRoutes);
router.use('/inventory', meter('INVENTORY'), inventoryRoutes);
router.use('/billing', meter('BILLING'), billingRoutes);
router.use('/appointment', meter('APPOINTMENTS'), appointmentRoutes);
router.use('/request', meter('APPOINTMENTS'), requestRoutes); // alias of /appointment — same router, same code -> one request = one hit
router.use('/admission', meter('ADMISSIONS'), admissionRoutes);

router.use('/auth', authRoutes);
router.use('/pre-requests', meter('ADMISSIONS'), preRequestRoutes);
router.use('/activity-log', activityRoutes);

router.use('/account', usageRoutes);

router.use('/platform', platformRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/rbac', rbacRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
