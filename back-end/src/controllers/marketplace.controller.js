const organizationService = require('../services/organization.service');
const subscriptionPlanService = require('../services/subscriptionPlan.service');
const provisioningService = require('../services/provisioning.service');
const authService = require('../services/auth.service');
const { createLogger } = require('../utils/logger');
const logger = createLogger('Marketplace');

/**
 * Organization Marketplace (tasks.md §4) — deliberately public endpoints
 * allowing patients and hospital chains to browse organizations, subscription plans,
 * and self-register into Federico.
 */
function listOrganizations(req, res) {
  res.status(200).json(organizationService.marketplaceListing());
}

function listPlans(req, res) {
  res.status(200).json(subscriptionPlanService.findAll());
}

function registerOrganization(req, res) {
  const {
    name,
    city,
    phone,
    email,
    address,
    specialties,
    emergency_available,
    plan_id,
    modules,
    admin_name,
    admin_email,
    admin_password,
    payment_reference,
  } = req.body;

  if (!name || !plan_id || !admin_email || !admin_password || !admin_name) {
    return res.status(400).json({
      message: 'Name, plan_id, admin_name, admin_email, and admin_password are required',
      error: 'Bad Request',
      statusCode: 400,
    });
  }

  const payload = {
    name,
    city: city || 'Main Branch',
    contact: {
      phone: phone || null,
      email: email || admin_email,
      address: address || null,
    },
    specialties: Array.isArray(specialties) ? specialties : [],
    emergency_available: Boolean(emergency_available),
    plan_id: Number(plan_id),
    modules: Array.isArray(modules) ? modules : undefined,
    admin_name,
    admin_email,
    admin_password,
  };

  const result = provisioningService.provision(payload);
  if (result.error) {
    return res.status(400).json({
      message: result.error,
      error: 'Bad Request',
      statusCode: 400,
    });
  }

  logger.log(
    `🏥 NEW ORG REGISTERED & PROVISIONED  org_id=${result.organization.organization_id}  name="${result.organization.name}"  plan_id=${plan_id}  payment_ref=${payment_reference || 'DIRECT'}`,
  );

  // Auto create session for immediate login
  const loginResult = authService.login(admin_email, admin_password, result.organization.organization_id);

  res.status(201).json({
    message: 'Organization successfully registered and provisioned',
    provisioned: result,
    session: loginResult.error ? null : loginResult,
  });
}

module.exports = { listOrganizations, listPlans, registerOrganization };

