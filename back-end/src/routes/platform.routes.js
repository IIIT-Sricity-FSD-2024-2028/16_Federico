'use strict';

const { Router } = require('express');
const controller = require('../controllers/platform.controller');
const { requireSession } = require('../middleware/session');
const { requirePlatformUser } = require('../middleware/platformAccess');
const { validateBody } = require('../validators/engine');
const {
  platformLoginRules,
  provisionOrganizationRules,
  createHospitalRules,
  setModuleFlagRules,
  createApiKeyRules,
  createPlanRules,
  setSubscriptionRules,
} = require('../validators/platform.validators');

const router = Router();
const gate = [requireSession, requirePlatformUser];

// Auth
router.post('/auth/login', validateBody(platformLoginRules), controller.login);
router.get('/auth/me', requireSession, requirePlatformUser, controller.me);
router.post('/auth/logout', requireSession, requirePlatformUser, controller.logout);

// Organizations
router.get('/organizations', ...gate, controller.findAllOrganizations);
router.post('/organizations', ...gate, validateBody(provisionOrganizationRules), controller.createOrganization);
router.get('/organizations/:id', ...gate, controller.findOrganization);
router.put('/organizations/:id/suspend', ...gate, controller.suspendOrganization);
router.put('/organizations/:id/activate', ...gate, controller.activateOrganization);
router.delete('/organizations/:id', ...gate, controller.deleteOrganization);
router.get('/organizations/:id/provisioning-log', ...gate, controller.provisioningLog);
router.get('/organizations/:id/usage', ...gate, controller.usage);
router.get('/usage', ...gate, controller.platformUsage);

// Hospitals (branches)
router.get('/organizations/:id/hospitals', ...gate, controller.findHospitals);
router.post('/organizations/:id/hospitals', ...gate, validateBody(createHospitalRules), controller.createHospital);

// Feature flags
router.get('/organizations/:id/modules', ...gate, controller.findModuleFlags);
router.put('/organizations/:id/modules/:moduleCode', ...gate, validateBody(setModuleFlagRules), controller.setModuleFlag);

// API keys
router.get('/organizations/:id/api-keys', ...gate, controller.findApiKeys);
router.post('/organizations/:id/api-keys', ...gate, validateBody(createApiKeyRules), controller.createApiKey);
router.delete('/api-keys/:id', ...gate, controller.revokeApiKey);

// Subscription plans
router.get('/plans', ...gate, controller.findAllPlans);
router.post('/plans', ...gate, validateBody(createPlanRules), controller.createPlan);
router.put('/plans/:id', ...gate, controller.updatePlan);

// Subscriptions
router.put('/organizations/:id/subscription', ...gate, validateBody(setSubscriptionRules), controller.setSubscription);
router.put('/organizations/:id/subscription/renew', ...gate, controller.renewSubscription);

module.exports = router;
