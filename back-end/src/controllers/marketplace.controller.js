'use strict';

const organizationService = require('../services/organization.service');
const subscriptionPlanService = require('../services/subscriptionPlan.service');
const provisioningService = require('../services/provisioning.service');
const authService = require('../services/auth.service');
const { CHECKS } = require('../validators/engine');
const { createLogger } = require('../utils/logger');
const logger = createLogger('Marketplace');

const ADMIN_PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_])\S{8,128}$/;
const PAYMENT_METHODS = new Set(['card', 'upi', 'netbanking']);

function badRequest(res, message) {
  return res.status(400).json({
    message,
    error: 'Bad Request',
    statusCode: 400,
  });
}

function validateRegistrationInput(body) {
  const {
    name,
    city,
    phone,
    address,
    specialties,
    plan_id,
    module_resources,
    admin_name,
    admin_email,
    admin_password,
    payment_method,
    payment_summary,
  } = body || {};

  if (!name || !plan_id || !admin_email || !admin_password || !admin_name) {
    return 'Name, plan_id, admin_name, admin_email, and admin_password are required';
  }

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName.length < 2 || trimmedName.length > 120) {
    return 'Organization name must be between 2 and 120 characters';
  }

  const trimmedAdminName = typeof admin_name === 'string' ? admin_name.trim() : '';
  if (trimmedAdminName.length < 2 || trimmedAdminName.length > 80) {
    return 'Administrator name must be between 2 and 80 characters';
  }

  if (!Number.isInteger(Number(plan_id)) || Number(plan_id) < 1) {
    return 'plan_id must be a positive integer';
  }

  if (typeof admin_password !== 'string' || !ADMIN_PASSWORD_REGEX.test(admin_password)) {
    return 'Administrator password must be 8–128 characters with uppercase, lowercase, number, and special character (no spaces)';
  }

  if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
    if (!CHECKS.isPhoneNumber(String(phone).trim())) {
      return 'Contact phone must be a valid phone number';
    }
  }

  if (city !== undefined && city !== null && typeof city === 'string' && city.trim().length > 80) {
    return 'City must be 80 characters or fewer';
  }

  if (address !== undefined && address !== null && typeof address === 'string' && address.trim().length > 250) {
    return 'Address must be 250 characters or fewer';
  }

  if (specialties !== undefined && specialties !== null) {
    if (!Array.isArray(specialties) || specialties.length > 15) {
      return 'Specialties must be an array of at most 15 items';
    }
    for (const s of specialties) {
      if (typeof s !== 'string' || !s.trim() || s.trim().length > 50) {
        return 'Each specialty must be a non-empty string up to 50 characters';
      }
    }
  }

  if (module_resources !== undefined && module_resources !== null) {
    if (typeof module_resources !== 'object' || Array.isArray(module_resources)) {
      return 'module_resources must be an object';
    }
    for (const modMap of Object.values(module_resources)) {
      if (!modMap || typeof modMap !== 'object' || Array.isArray(modMap)) {
        return 'Invalid module_resources structure';
      }
      for (const qty of Object.values(modMap)) {
        const n = Number(qty);
        if (!Number.isInteger(n) || n < 0 || n > 1000000) {
          return 'Resource quantities must be whole integers between 0 and 1,000,000';
        }
      }
    }
  }

  if (payment_method !== undefined && payment_method !== null) {
    if (!PAYMENT_METHODS.has(payment_method)) {
      return 'payment_method must be card, upi, or netbanking';
    }
    if (!payment_summary || typeof payment_summary !== 'object' || Array.isArray(payment_summary)) {
      return 'payment_summary is required when payment_method is provided';
    }
    if (payment_method === 'card' && !/^\d{4}$/.test(String(payment_summary.last4 || ''))) {
      return 'Card payment_summary must include a 4-digit last4 value';
    }
    if (
      payment_method === 'upi' &&
      (typeof payment_summary.upi_id !== 'string' || !payment_summary.upi_id.trim() || payment_summary.upi_id.length > 320)
    ) {
      return 'UPI payment_summary must include a valid upi_id';
    }
    if (
      payment_method === 'netbanking' &&
      (typeof payment_summary.bank_name !== 'string' || !payment_summary.bank_name.trim() || payment_summary.bank_name.length > 100)
    ) {
      return 'Net banking payment_summary must include a valid bank_name';
    }
  }

  return null;
}

function sanitizePaymentSummary(method, summary) {
  if (!method || !summary) return null;
  if (method === 'card') return { last4: String(summary.last4) };
  if (method === 'upi') return { upi_id: String(summary.upi_id).trim() };
  if (method === 'netbanking') return { bank_name: String(summary.bank_name).trim() };
  return null;
}

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
  const validationError = validateRegistrationInput(req.body);
  if (validationError) {
    return badRequest(res, validationError);
  }

  const {
    name,
    email_domain,
    city,
    phone,
    email,
    address,
    specialties,
    emergency_available,
    plan_id,
    modules,
    module_instances,
    module_resources,
    admin_name,
    admin_email,
    admin_password,
    payment_reference,
    payment_method,
    payment_summary,
  } = req.body;

  const payload = {
    name: name.trim(),
    email_domain,
    city: city && String(city).trim() ? String(city).trim() : 'Main Branch',
    contact: {
      phone: phone ? String(phone).trim() : null,
      email: email || admin_email,
      address: address && String(address).trim() ? String(address).trim() : null,
    },
    specialties: Array.isArray(specialties) ? specialties.map((s) => s.trim()) : [],
    emergency_available: Boolean(emergency_available),
    plan_id: Number(plan_id),
    modules: Array.isArray(modules) ? modules : undefined,
    module_instances:
      module_instances && typeof module_instances === 'object'
        ? module_instances
        : undefined,
    module_resources:
      module_resources && typeof module_resources === 'object'
        ? module_resources
        : undefined,
    admin_name: admin_name.trim(),
    admin_email,
    admin_password,
    payment_reference: payment_reference ? String(payment_reference).trim() : undefined,
    payment_method: payment_method || undefined,
    payment_summary: sanitizePaymentSummary(payment_method, payment_summary) || undefined,
  };

  const result = provisioningService.provision(payload);
  if (result.error) {
    const [status, message] = provisioningService.errorResponseFor(result);
    return res.status(status).json({
      message,
      error: status === 409 ? 'Conflict' : 'Bad Request',
      statusCode: status,
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
