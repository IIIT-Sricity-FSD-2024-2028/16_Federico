'use strict';

const platformAuthService = require('../services/platformAuth.service');
const organizationService = require('../services/organization.service');
const subscriptionPlanService = require('../services/subscriptionPlan.service');
const subscriptionService = require('../services/subscription.service');
const provisioningService = require('../services/provisioning.service');
const platformActivityService = require('../services/platformActivity.service');
const dataStore = require('../store/dataStore');
const { createLogger } = require('../utils/logger');
const { sendResult } = require('../utils/sendResult');

const logger = createLogger('🛰️  Platform');

// ---- Platform auth ----

function login(req, res) {
  const { email, password } = req.body;
  const result = platformAuthService.login(email, password);
  if (result.error) {
    logger.log(`❌ PLATFORM LOGIN FAILED  email=${email}`);
    return res.status(401).json({
      message: 'Invalid email or password',
      error: 'Unauthorized',
      statusCode: 401,
    });
  }
  logger.log(`✅ PLATFORM LOGIN  email=${email}`);
  res.status(200).json(result);
}

function me(req, res) {
  const result = platformAuthService.me(req.session);
  if (!result)
    return res.status(401).json({
      message: 'Authentication required',
      error: 'Unauthorized',
      statusCode: 401,
    });
  res.status(200).json(result);
}

function logout(req, res) {
  const header = req.headers['authorization'] || '';
  const [, headerToken] = header.split(' ');
  const token = headerToken || (req.session && req.session.token);
  if (token) platformAuthService.logout(token);
  res.setHeader('Set-Cookie', 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
  res.status(200).json({ success: true });
}

// ---- Organizations ----

function findAllOrganizations(req, res) {
  sendResult(res, organizationService.findAll(), 200);
}

function findOrganization(req, res) {
  sendResult(res, organizationService.findById(+req.params.id), 200);
}

function createOrganization(req, res) {
  const result = provisioningService.provision(req.body);
  if (result.error) {
    return res.status(400).json({
      message: 'Unknown subscription plan',
      error: 'Bad Request',
      statusCode: 400,
    });
  }
  logger.log(
    `✅ PROVISIONED ORGANIZATION  id=${result.organization.organization_id}  name="${result.organization.name}"`,
  );
  platformActivityService.log(
    req.session.userId,
    'PROVISION_ORGANIZATION',
    result.organization.organization_id,
    `Provisioned "${result.organization.name}"`,
  );
  sendResult(res, result, 201);
}

function suspendOrganization(req, res) {
  const result = organizationService.setStatus(+req.params.id, 'SUSPENDED');
  if (result) {
    logger.log(`⏸️  SUSPENDED  organization_id=${result.organization_id}`);
    platformActivityService.log(
      req.session.userId,
      'SUSPEND_ORGANIZATION',
      result.organization_id,
      `Suspended "${result.name}"`,
    );
  }
  sendResult(res, result, 200);
}

function activateOrganization(req, res) {
  const result = organizationService.setStatus(+req.params.id, 'ACTIVE');
  if (result) {
    logger.log(`▶️  ACTIVATED  organization_id=${result.organization_id}`);
    platformActivityService.log(
      req.session.userId,
      'ACTIVATE_ORGANIZATION',
      result.organization_id,
      `Activated "${result.name}"`,
    );
  }
  sendResult(res, result, 200);
}

function deleteOrganization(req, res) {
  const result = organizationService.remove(+req.params.id);
  if (result) {
    logger.log(`🗑️  DELETED  organization_id=${result.organization_id}`);
    platformActivityService.log(
      req.session.userId,
      'DELETE_ORGANIZATION',
      result.organization_id,
      `Deleted "${result.name}"`,
    );
  }
  sendResult(res, result, 200);
}

function activityLog(req, res) {
  sendResult(res, platformActivityService.findAll(), 200);
}

function provisioningLog(req, res) {
  const organizationId = +req.params.id;
  sendResult(
    res,
    dataStore.provisioningLog.filter(
      (l) => l.organization_id === organizationId,
    ),
    200,
  );
}

function usage(req, res) {
  sendResult(res, organizationService.usageFor(+req.params.id), 200);
}

function platformUsage(req, res) {
  const organizations = organizationService.findAll();
  const orgDetails = organizations.map((o) => {
    const usageData = organizationService.usageFor(o.organization_id);
    return {
      organization_id: o.organization_id,
      name: o.name,
      status: o.status,
      ...usageData,
    };
  });

  // Calculate platform financial analytics (MRR / ARR)
  let totalMrr = 0;
  const revenueByPlan = {};

  dataStore.subscriptionPlans.forEach((plan) => {
    revenueByPlan[plan.name] = {
      plan_id: plan.plan_id,
      price_monthly: plan.price_monthly,
      active_subscriptions: 0,
      total_income: 0,
    };
  });

  orgDetails.forEach((org) => {
    if (org.status === 'ACTIVE' && org.subscription) {
      const price = Number(org.subscription.price_monthly) || 0;
      totalMrr += price;
      const planName = org.subscription.plan_name;
      if (revenueByPlan[planName]) {
        revenueByPlan[planName].active_subscriptions += 1;
        revenueByPlan[planName].total_income += price;
      }
    }
  });

  const totalArr = totalMrr * 12;

  sendResult(
    res,
    {
      total_organizations: organizations.length,
      active_organizations: organizations.filter((o) => o.status === 'ACTIVE')
        .length,
      suspended_organizations: organizations.filter(
        (o) => o.status === 'SUSPENDED',
      ).length,
      total_users: dataStore.users.length,
      total_patients: dataStore.patients.length,
      total_hospitals: dataStore.hospitals.length,
      total_mrr: totalMrr,
      total_arr: totalArr,
      revenue_by_plan: revenueByPlan,
      organizations: orgDetails,
    },
    200,
  );
}

// ---- Hospitals (branches) ----

function findHospitals(req, res) {
  sendResult(res, organizationService.hospitalsFor(+req.params.id), 200);
}

function createHospital(req, res) {
  const result = organizationService.createHospital(+req.params.id, req.body);
  logger.log(
    `✅ BRANCH CREATED  hospital_id=${result.hospital_id}  organization_id=${result.organization_id}`,
  );
  sendResult(res, result, 201);
}

// ---- Feature flags ----

function findModuleFlags(req, res) {
  sendResult(res, organizationService.allModuleFlagsFor(+req.params.id), 200);
}

function setModuleFlag(req, res) {
  const result = organizationService.setModuleFlag(
    +req.params.id,
    req.params.moduleCode,
    Boolean(req.body.enabled),
  );
  logger.log(
    `🚩 MODULE FLAG  organization_id=${req.params.id}  module=${req.params.moduleCode}  enabled=${req.body.enabled}`,
  );
  platformActivityService.log(
    req.session.userId,
    'SET_MODULE_FLAG',
    +req.params.id,
    `${req.params.moduleCode} ${req.body.enabled ? 'enabled' : 'disabled'}`,
  );
  sendResult(res, result, 200);
}

// ---- API keys ----

function findApiKeys(req, res) {
  sendResult(
    res,
    dataStore.apiKeys.filter((k) => k.organization_id === +req.params.id),
    200,
  );
}

function createApiKey(req, res) {
  const result = provisioningService.generateApiKey(
    +req.params.id,
    req.body.label,
  );
  logger.log(`🔑 API KEY GENERATED  organization_id=${req.params.id}`);
  sendResult(res, result, 201);
}

function revokeApiKey(req, res) {
  const key = dataStore.apiKeys.find((k) => k.api_key_id === +req.params.id);
  if (!key) return sendResult(res, null, 200);
  key.revoked_at = new Date().toISOString();
  sendResult(res, key, 200);
}

// ---- Subscription plans ----

function findAllPlans(req, res) {
  sendResult(res, subscriptionPlanService.findAll(), 200);
}

function createPlan(req, res) {
  const result = subscriptionPlanService.create(req.body);
  logger.log(`✅ PLAN CREATED  id=${result.plan_id}  name="${result.name}"`);
  platformActivityService.log(
    req.session.userId,
    'CREATE_PLAN',
    null,
    `Created plan "${result.name}"`,
  );
  sendResult(res, result, 201);
}

function updatePlan(req, res) {
  sendResult(
    res,
    subscriptionPlanService.update(+req.params.id, req.body),
    200,
  );
}

// ---- Subscriptions ----

function getSubscription(req, res) {
  const organizationId = +req.params.id;
  const subscription = subscriptionService.findByOrg(organizationId);
  if (!subscription) return sendResult(res, null, 200);
  const plan = subscriptionPlanService.findById(subscription.plan_id);
  sendResult(res, { subscription, plan }, 200);
}

function setSubscription(req, res) {
  const result = subscriptionService.setPlan(+req.params.id, req.body.plan_id);
  if (result.error)
    return res.status(400).json({
      message: 'Unknown subscription plan',
      error: 'Bad Request',
      statusCode: 400,
    });
  logger.log(
    `📦 SUBSCRIPTION SET  organization_id=${req.params.id}  plan_id=${req.body.plan_id}`,
  );
  platformActivityService.log(
    req.session.userId,
    'SET_SUBSCRIPTION',
    +req.params.id,
    `Plan set to "${result.plan.name}"`,
  );
  sendResult(res, result, 200);
}

function renewSubscription(req, res) {
  const result = subscriptionService.renew(+req.params.id);
  if (result)
    platformActivityService.log(
      req.session.userId,
      'RENEW_SUBSCRIPTION',
      +req.params.id,
      'Subscription renewed',
    );
  sendResult(res, result, 200);
}

module.exports = {
  login,
  me,
  logout,
  findAllOrganizations,
  findOrganization,
  createOrganization,
  suspendOrganization,
  activateOrganization,
  deleteOrganization,
  provisioningLog,
  activityLog,
  usage,
  platformUsage,
  findHospitals,
  createHospital,
  findModuleFlags,
  setModuleFlag,
  findApiKeys,
  createApiKey,
  revokeApiKey,
  findAllPlans,
  createPlan,
  updatePlan,
  getSubscription,
  setSubscription,
  renewSubscription,
};
