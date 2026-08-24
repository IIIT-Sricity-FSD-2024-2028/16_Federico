'use strict';

const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const ROUTES = [
  ['Admissions', 'get', '/admission', 'Get all admissions'],
  ['Admissions', 'get', '/admission/{id}', 'Get admission by ID'],
  ['Admissions', 'post', '/admission', 'Create a new admission'],
  ['Admissions', 'put', '/admission/{id}', 'Update admission details'],

  ['Billing', 'get', '/billing/services', 'Get all billable services'],
  ['Billing', 'post', '/billing/services', 'Create a new billable service'],
  [
    'Billing',
    'get',
    '/billing/ledger/{admissionId}',
    'Get ledger for an admission',
  ],
  ['Billing', 'post', '/billing/ledger', 'Create a ledger for an admission'],
  [
    'Billing',
    'get',
    '/billing/ledger/{ledgerId}/entries',
    'Get all entries for a ledger',
  ],
  ['Billing', 'post', '/billing/ledger/entry', 'Add a ledger entry'],
  ['Billing', 'get', '/billing/payments', 'Get all payments'],
  ['Billing', 'post', '/billing/payments', 'Create a new payment'],
  [
    'Billing',
    'post',
    '/billing/discharge-summary',
    'Create a discharge summary',
  ],

  [
    'Data Sync',
    'get',
    '/data/full-state',
    'Get the full in-memory state representing the DB schema',
  ],
  ['Data Sync', 'post', '/data/full-state', 'Update the full in-memory state'],

  ['Doctors', 'get', '/doctor', 'Get all doctors'],
  ['Doctors', 'get', '/doctor/{id}', 'Get a doctor by ID'],
  ['Doctors', 'post', '/doctor', 'Create a new doctor'],
  ['Doctors', 'put', '/doctor/{id}', 'Update a doctor'],
  ['Doctors', 'delete', '/doctor/{id}', 'Delete a doctor'],
  [
    'Doctors',
    'get',
    '/doctor/availability/all',
    'Get all doctor availabilities',
  ],
  [
    'Doctors',
    'get',
    '/doctor/{id}/availability',
    'Get availability by doctor ID',
  ],
  [
    'Doctors',
    'post',
    '/doctor/availability',
    'Create a new doctor availability',
  ],
  [
    'Doctors',
    'delete',
    '/doctor/availability/{id}',
    'Delete a doctor availability',
  ],

  ['Inventory', 'get', '/inventory/items', 'Get all inventory items'],
  ['Inventory', 'post', '/inventory/items', 'Add a new inventory item'],
  ['Inventory', 'put', '/inventory/items/{id}', 'Update inventory item'],
  ['Inventory', 'get', '/inventory/requests', 'Get all purchase requests'],
  ['Inventory', 'post', '/inventory/requests', 'Create a purchase request'],
  [
    'Inventory',
    'put',
    '/inventory/requests/{id}',
    'Update purchase request status',
  ],

  ['Patients', 'get', '/patient', 'Get all patients'],
  ['Patients', 'get', '/patient/portal/summary', 'Composite summary for patient dashboard'],
  ['Patients', 'get', '/patient/{id}', 'Get a patient by ID or UHID'],
  ['Patients', 'post', '/patient', 'Register a new patient'],
  ['Patients', 'put', '/patient/{id}', 'Update patient information'],
  ['Patients', 'delete', '/patient/{id}', 'Delete a patient'],
  ['Patients', 'get', '/patient/insurance/all', 'Get all patient insurances'],
  [
    'Patients',
    'get',
    '/patient/{id}/insurance',
    'Get insurances by patient ID',
  ],
  ['Patients', 'post', '/patient/insurance', 'Add insurance for a patient'],

  ['Wards', 'get', '/ward', 'Get all wards'],
  ['Wards', 'post', '/ward', 'Create a new ward'],
  ['Wards', 'get', '/ward/beds', 'Get all beds across all wards'],
  ['Wards', 'get', '/ward/{id}/beds', 'Get beds in a specific ward'],
  ['Wards', 'post', '/ward/bed', 'Create a new bed'],
  ['Wards', 'put', '/ward/bed/{bedId}', 'Update bed status'],

  ['Appointments', 'get', '/appointment', 'Get all appointments'],
  ['Appointments', 'post', '/appointment', 'Create a new appointment'],
  ['Appointments', 'put', '/appointment/{id}', 'Update an appointment status'],

  ['PreRequests', 'get', '/pre-requests', 'Get all pre-registration requests'],
  ['PreRequests', 'post', '/pre-requests', 'Create a new pre-registration request'],
  ['PreRequests', 'put', '/pre-requests/{id}', 'Transition or update a pre-registration request'],

  ['Auth', 'post', '/auth/login', 'User login authentication'],
  ['Auth', 'post', '/auth/signup', 'Patient self-service signup'],
  ['Auth', 'get', '/auth/me', 'Get currently authenticated user session'],
  ['Auth', 'post', '/auth/logout', 'User logout and session invalidation'],

  [
    'Marketplace',
    'get',
    '/marketplace/organizations',
    'Public directory of active organizations',
  ],
  [
    'Marketplace',
    'post',
    '/marketplace/register-organization',
    'Self-service organization and superuser registration',
  ],

  ['Platform', 'post', '/platform/auth/login', 'Platform Super User login'],
  ['Platform', 'get', '/platform/auth/me', 'Current Platform Super User'],
  ['Platform', 'get', '/platform/organizations', 'List all organizations'],
  [
    'Platform',
    'post',
    '/platform/organizations',
    'Provision a new organization',
  ],
  [
    'Platform',
    'get',
    '/platform/organizations/{id}',
    'Get an organization by ID',
  ],
  [
    'Platform',
    'put',
    '/platform/organizations/{id}/suspend',
    'Suspend an organization',
  ],
  [
    'Platform',
    'put',
    '/platform/organizations/{id}/activate',
    'Activate an organization',
  ],
  [
    'Platform',
    'delete',
    '/platform/organizations/{id}',
    'Delete (soft) an organization',
  ],
  [
    'Platform',
    'get',
    '/platform/organizations/{id}/provisioning-log',
    'Provisioning audit trail for an organization',
  ],
  [
    'Platform',
    'get',
    '/platform/organizations/{id}/usage',
    'Resource usage for an organization',
  ],
  ['Platform', 'get', '/platform/usage', 'Platform-wide usage summary'],
  [
    'Platform',
    'get',
    '/platform/activity-log',
    'Platform Super User action audit trail',
  ],
  [
    'Platform',
    'get',
    '/platform/organizations/{id}/hospitals',
    "List an organization's hospital branches",
  ],
  [
    'Platform',
    'post',
    '/platform/organizations/{id}/hospitals',
    'Add a hospital branch',
  ],
  [
    'Platform',
    'get',
    '/platform/organizations/{id}/modules',
    'List feature-flag state for an organization',
  ],
  [
    'Platform',
    'put',
    '/platform/organizations/{id}/modules/{moduleCode}',
    'Enable/disable a module',
  ],
  [
    'Platform',
    'get',
    '/platform/organizations/{id}/api-keys',
    'List API keys for an organization',
  ],
  [
    'Platform',
    'post',
    '/platform/organizations/{id}/api-keys',
    'Generate a new API key',
  ],
  ['Platform', 'delete', '/platform/api-keys/{id}', 'Revoke an API key'],
  ['Platform', 'get', '/platform/plans', 'List subscription plans'],
  ['Platform', 'post', '/platform/plans', 'Create a subscription plan'],
  ['Platform', 'put', '/platform/plans/{id}', 'Update a subscription plan'],
  [
    'Platform',
    'get',
    '/platform/organizations/{id}/subscription',
    "Get an organization's current subscription + plan",
  ],
  [
    'Platform',
    'put',
    '/platform/organizations/{id}/subscription',
    "Set/upgrade/downgrade an organization's plan",
  ],
  [
    'Platform',
    'put',
    '/platform/organizations/{id}/subscription/renew',
    "Renew an organization's subscription",
  ],

  [
    'RBAC',
    'get',
    '/rbac/roles',
    "List custom roles for the caller's organization",
  ],
  ['RBAC', 'post', '/rbac/roles', 'Create a custom role'],
  ['RBAC', 'get', '/rbac/permissions', 'List the fixed permission catalog'],
  [
    'RBAC',
    'post',
    '/rbac/roles/{id}/permissions',
    'Grant a permission to a custom role',
  ],
  [
    'RBAC',
    'get',
    '/rbac/roles/{id}/permissions',
    "Get a custom role's currently granted permissions",
  ],
  [
    'RBAC',
    'delete',
    '/rbac/roles/{id}/permissions/{permissionId}',
    'Revoke a permission from a custom role',
  ],
  [
    'RBAC',
    'post',
    '/rbac/staff/{userId}/role',
    'Assign a custom role to a staff user',
  ],
  [
    'RBAC',
    'delete',
    '/rbac/staff/{userId}/role/{roleId}',
    'Remove a custom role from a staff user',
  ],
  [
    'RBAC',
    'get',
    '/rbac/staff',
    "List staff in the caller's organization with their roles",
  ],
];

function buildDocument() {
  const paths = {};
  for (const [tag, method, route, summary] of ROUTES) {
    paths[route] = paths[route] || {};
    const parameters = [...route.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
    paths[route][method] = {
      tags: [tag],
      summary,
      security: [{ bearerAuth: [] }],
      parameters: parameters.length ? parameters : undefined,
      responses: { 200: { description: 'Successful response' } },
    };
  }

  paths['/health'] = {
    get: {
      tags: ['Health'],
      summary: 'System health check and uptime monitor',
      responses: { 200: { description: 'System healthy' } },
    },
  };

  return {
    openapi: '3.0.0',
    info: {
      title: 'Federico Healthcare Platform API',
      description: 'Production REST API for Federico Multi-Tenant HMS',
      version: '2.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your session token in the format: Bearer <token>',
        },
      },
    },
    paths,
  };
}

function setupSwagger(app) {
  const document = buildDocument();
  app.use('/api', swaggerUi.serve, swaggerUi.setup(document));

  // Non-blocking, safe export
  try {
    const docsPath = path.resolve(__dirname, '../../docs');
    if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath, { recursive: true });
    }
    fs.writeFileSync(
      path.join(docsPath, 'swagger.json'),
      JSON.stringify(document, null, 2),
    );
  } catch (err) {
    // Non-fatal in read-only runtimes
  }
}

module.exports = { setupSwagger };
