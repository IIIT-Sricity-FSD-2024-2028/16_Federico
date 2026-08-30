'use strict';

const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const ROUTES = [
  // Admissions
  ['Admissions', 'get', '/admission', 'Get all admissions'],
  ['Admissions', 'get', '/admission/{id}', 'Get admission by ID'],
  ['Admissions', 'post', '/admission', 'Create a new admission'],
  ['Admissions', 'put', '/admission/{id}', 'Update admission details'],

  // Appointments
  ['Appointments', 'get', '/appointment', 'Get all appointments'],
  ['Appointments', 'post', '/appointment', 'Create a new appointment'],
  ['Appointments', 'put', '/appointment/{id}', 'Update appointment status'],

  // Pre-Requests (Intake Lifecycle)
  ['PreRequests', 'get', '/pre-requests', 'Get all pre-registration requests'],
  ['PreRequests', 'get', '/pre-requests/{id}', 'Get pre-registration request by ID'],
  ['PreRequests', 'post', '/pre-requests', 'Create a new pre-registration request'],
  ['PreRequests', 'put', '/pre-requests/{id}', 'Transition or update a pre-registration request'],

  // Auth
  ['Auth', 'post', '/auth/login', 'User login authentication'],
  ['Auth', 'post', '/auth/signup', 'Patient self-service signup'],
  ['Auth', 'get', '/auth/me', 'Get currently authenticated user session'],
  ['Auth', 'post', '/auth/logout', 'User logout and session invalidation'],

  // Billing
  ['Billing', 'get', '/billing/services', 'Get all billable services'],
  ['Billing', 'post', '/billing/services', 'Create a new billable service'],
  ['Billing', 'get', '/billing/ledgers', 'Get all ledgers'],
  ['Billing', 'get', '/billing/ledger/{admissionId}', 'Get ledger for an admission'],
  ['Billing', 'post', '/billing/ledger', 'Create a ledger for an admission'],
  ['Billing', 'get', '/billing/ledger/{ledgerId}/entries', 'Get all entries for a ledger'],
  ['Billing', 'post', '/billing/ledger/entry', 'Add a ledger entry'],
  ['Billing', 'put', '/billing/ledger/{id}/dispatch', 'Dispatch a ledger bill to the patient'],
  ['Billing', 'get', '/billing/payments', 'Get all payments'],
  ['Billing', 'post', '/billing/payments', 'Create a new payment'],
  ['Billing', 'post', '/billing/discharge-summary', 'Create a discharge summary'],
  ['Billing', 'get', '/billing/discharge-summary/{admissionId}', 'Get discharge summary by admission ID'],
  ['Billing', 'get', '/billing/patient/{patientId}/bills', 'Get published bills for a patient'],
  ['Billing', 'get', '/billing/receipts', 'Get all receipts'],
  ['Billing', 'get', '/billing/patient/{patientId}/receipts', 'Get receipts for a patient'],
  ['Billing', 'get', '/billing/leaders', 'Get all leader approval requests'],
  ['Billing', 'post', '/billing/leaders', 'Create a leader request'],
  ['Billing', 'put', '/billing/leaders/{id}/approve', 'Approve a leader request'],

  // Doctors
  ['Doctors', 'get', '/doctor', 'Get all doctors'],
  ['Doctors', 'get', '/doctor/{id}', 'Get a doctor by ID'],
  ['Doctors', 'post', '/doctor', 'Create a new doctor'],
  ['Doctors', 'put', '/doctor/{id}', 'Update a doctor'],
  ['Doctors', 'delete', '/doctor/{id}', 'Delete a doctor'],
  ['Doctors', 'get', '/doctor/availability/all', 'Get all doctor availabilities'],
  ['Doctors', 'get', '/doctor/{id}/availability', 'Get availability by doctor ID'],
  ['Doctors', 'post', '/doctor/availability', 'Create a new doctor availability'],
  ['Doctors', 'delete', '/doctor/availability/{id}', 'Delete a doctor availability'],

  // Patients
  ['Patients', 'get', '/patient', 'Get all patients'],
  ['Patients', 'get', '/patient/portal/summary', 'Composite summary for patient dashboard'],
  ['Patients', 'get', '/patient/portal/summary/{id}', 'Composite summary for specific patient ID'],
  ['Patients', 'get', '/patient/{id}', 'Get a patient by ID or UHID'],
  ['Patients', 'post', '/patient', 'Register a new patient'],
  ['Patients', 'put', '/patient/{id}', 'Update patient information'],
  ['Patients', 'delete', '/patient/{id}', 'Delete a patient'],
  ['Patients', 'get', '/patient/insurance/all', 'Get all patient insurances'],
  ['Patients', 'get', '/patient/{id}/insurance', 'Get insurances by patient ID'],
  ['Patients', 'post', '/patient/insurance', 'Add insurance for a patient'],

  // Wards & Beds
  ['Wards', 'get', '/ward', 'Get all wards'],
  ['Wards', 'post', '/ward', 'Create a new ward'],
  ['Wards', 'put', '/ward/{id}', 'Update ward details'],
  ['Wards', 'delete', '/ward/{id}', 'Delete a ward'],
  ['Wards', 'get', '/ward/beds', 'Get all beds across all wards'],
  ['Wards', 'get', '/ward/{id}/beds', 'Get beds in a specific ward'],
  ['Wards', 'post', '/ward/bed', 'Create a new bed'],
  ['Wards', 'put', '/ward/bed/{bedId}', 'Update bed status'],
  ['Wards', 'get', '/ward/bed-requests', 'Get all bed allocation requests'],
  ['Wards', 'post', '/ward/bed-requests', 'Create a bed allocation request'],
  ['Wards', 'put', '/ward/bed-requests/{id}', 'Allocate or reject a bed request'],
  ['Wards', 'get', '/ward/emergency', 'Get all emergency intake records'],
  ['Wards', 'post', '/ward/emergency', 'Create an emergency intake record'],
  ['Wards', 'put', '/ward/emergency/{id}', 'Update emergency intake status'],

  // Inventory
  ['Inventory', 'get', '/inventory/items', 'Get all inventory items'],
  ['Inventory', 'post', '/inventory/items', 'Add a new inventory item'],
  ['Inventory', 'put', '/inventory/items/{id}', 'Update inventory item'],
  ['Inventory', 'delete', '/inventory/items/{id}', 'Delete an inventory item'],
  ['Inventory', 'get', '/inventory/requests', 'Get all purchase requests'],
  ['Inventory', 'post', '/inventory/requests', 'Create a purchase request'],
  ['Inventory', 'put', '/inventory/requests/{id}', 'Update purchase request status'],

  // Activity Log
  ['Activity Log', 'get', '/activity-log', 'Get system audit trail and activity log'],

  // File Upload
  ['Uploads', 'post', '/uploads/document', 'Upload a patient/admission document (PDF/image, max 5MB)'],
  ['Uploads', 'post', '/uploads/branding', 'Upload a hospital branding logo (PDF/image, max 5MB)'],
  ['Uploads', 'post', '/uploads/inventory', 'Upload an inventory purchase invoice (PDF/image, max 5MB)'],
  ['Uploads', 'get', '/uploads/{category}/{filename}', 'Retrieve a previously uploaded file by category + filename'],
  ['Uploads', 'get', '/uploads/system/logs-status', 'Log and Error Management status: size/mtime of logs/*.log'],

  // Data Sync
  ['Data Sync', 'get', '/data/full-state', 'Get the full in-memory state representing the DB schema'],
  ['Data Sync', 'post', '/data/full-state', 'Update the full in-memory state'],

  // Marketplace
  ['Marketplace', 'get', '/marketplace/organizations', 'Public directory of active organizations'],
  ['Marketplace', 'get', '/marketplace/plans', 'Public directory of available subscription plans'],
  ['Marketplace', 'post', '/marketplace/register-organization', 'Self-service organization and superuser registration'],

  // Platform Administration
  ['Platform', 'post', '/platform/auth/login', 'Platform Super User login'],
  ['Platform', 'get', '/platform/auth/me', 'Current Platform Super User'],
  ['Platform', 'post', '/platform/auth/logout', 'Platform Super User logout'],
  ['Platform', 'get', '/platform/organizations', 'List all organizations'],
  ['Platform', 'post', '/platform/organizations', 'Provision a new organization'],
  ['Platform', 'get', '/platform/organizations/{id}', 'Get an organization by ID'],
  ['Platform', 'put', '/platform/organizations/{id}/suspend', 'Suspend an organization'],
  ['Platform', 'put', '/platform/organizations/{id}/activate', 'Activate an organization'],
  ['Platform', 'delete', '/platform/organizations/{id}', 'Delete (soft) an organization'],
  ['Platform', 'get', '/platform/organizations/{id}/provisioning-log', 'Provisioning audit trail for an organization'],
  ['Platform', 'get', '/platform/organizations/{id}/usage', 'Resource usage for an organization'],
  ['Platform', 'get', '/platform/usage', 'Platform-wide usage summary'],
  ['Platform', 'get', '/platform/activity-log', 'Platform Super User action audit trail'],
  ['Platform', 'get', '/platform/organizations/{id}/hospitals', "List an organization's hospital branches"],
  ['Platform', 'post', '/platform/organizations/{id}/hospitals', 'Add a hospital branch'],
  ['Platform', 'get', '/platform/organizations/{id}/modules', 'List feature-flag state for an organization'],
  ['Platform', 'put', '/platform/organizations/{id}/modules/{moduleCode}', 'Enable/disable a module'],
  ['Platform', 'get', '/platform/organizations/{id}/api-keys', 'List API keys for an organization'],
  ['Platform', 'post', '/platform/organizations/{id}/api-keys', 'Generate a new API key'],
  ['Platform', 'delete', '/platform/api-keys/{id}', 'Revoke an API key'],
  ['Platform', 'get', '/platform/plans', 'List subscription plans'],
  ['Platform', 'post', '/platform/plans', 'Create a subscription plan'],
  ['Platform', 'put', '/platform/plans/{id}', 'Update a subscription plan'],
  ['Platform', 'get', '/platform/organizations/{id}/subscription', "Get an organization's current subscription + plan"],
  ['Platform', 'put', '/platform/organizations/{id}/subscription', "Set/upgrade/downgrade an organization's plan"],
  ['Platform', 'put', '/platform/organizations/{id}/subscription/renew', "Renew an organization's subscription"],

  // Dynamic RBAC
  ['RBAC', 'get', '/rbac/roles', "List custom roles for the caller's organization"],
  ['RBAC', 'post', '/rbac/roles', 'Create a custom role'],
  ['RBAC', 'get', '/rbac/permissions', 'List the fixed permission catalog'],
  ['RBAC', 'post', '/rbac/roles/{id}/permissions', 'Grant a permission to a custom role'],
  ['RBAC', 'get', '/rbac/roles/{id}/permissions', "Get a custom role's currently granted permissions"],
  ['RBAC', 'delete', '/rbac/roles/{id}/permissions/{permissionId}', 'Revoke a permission from a custom role'],
  ['RBAC', 'post', '/rbac/staff/{userId}/role', 'Assign a custom role to a staff user'],
  ['RBAC', 'delete', '/rbac/staff/{userId}/role/{roleId}', 'Remove a custom role from a staff user'],
  ['RBAC', 'get', '/rbac/staff', "List staff in the caller's organization with their roles"],
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
          description: 'Session bearer token obtained from /auth/login or /platform/auth/login',
        },
        xRoleAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-role',
          description: 'Legacy role header for backward compatibility (e.g. ADMIN, SUPER_USER)',
        },
      },
    },
    paths,
  };
}

function setupSwagger(app) {
  const document = buildDocument();
  app.use('/api', swaggerUi.serve, swaggerUi.setup(document));

  // Non-blocking, safe export of OpenAPI JSON spec
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
    console.warn(`[Swagger] Note: Could not export swagger.json to disk: ${err.message}`);
  }
}

module.exports = { setupSwagger, buildDocument };
