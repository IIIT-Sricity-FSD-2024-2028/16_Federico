'use strict';

const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

// Mirrors the @ApiOperation summaries from the original NestJS controllers,
// grouped under the same @ApiTags used before, so the generated
// docs/swagger.json stays a faithful (if hand-assembled rather than
// decorator-derived) equivalent of the original auto-generated document.
const ROUTES = [
  ['Admissions', 'get', '/admission', 'Get all admissions'],
  ['Admissions', 'get', '/admission/{id}', 'Get admission by ID'],
  ['Admissions', 'post', '/admission', 'Create a new admission'],
  ['Admissions', 'put', '/admission/{id}', 'Update admission details'],

  ['Billing', 'get', '/billing/services', 'Get all billable services'],
  ['Billing', 'post', '/billing/services', 'Create a new billable service'],
  ['Billing', 'get', '/billing/ledger/{admissionId}', 'Get ledger for an admission'],
  ['Billing', 'post', '/billing/ledger', 'Create a ledger for an admission'],
  ['Billing', 'get', '/billing/ledger/{ledgerId}/entries', 'Get all entries for a ledger'],
  ['Billing', 'post', '/billing/ledger/entry', 'Add a ledger entry'],
  ['Billing', 'get', '/billing/payments', 'Get all payments'],
  ['Billing', 'post', '/billing/payments', 'Create a new payment'],
  ['Billing', 'post', '/billing/discharge-summary', 'Create a discharge summary'],

  ['Data Sync', 'get', '/data/full-state', 'Get the full in-memory state representing the DB schema'],
  ['Data Sync', 'post', '/data/full-state', 'Update the full in-memory state'],

  ['Doctors', 'get', '/doctor', 'Get all doctors'],
  ['Doctors', 'get', '/doctor/{id}', 'Get a doctor by ID'],
  ['Doctors', 'post', '/doctor', 'Create a new doctor'],
  ['Doctors', 'put', '/doctor/{id}', 'Update a doctor'],
  ['Doctors', 'delete', '/doctor/{id}', 'Delete a doctor'],
  ['Doctors', 'get', '/doctor/availability/all', 'Get all doctor availabilities'],
  ['Doctors', 'get', '/doctor/{id}/availability', 'Get availability by doctor ID'],
  ['Doctors', 'post', '/doctor/availability', 'Create a new doctor availability'],
  ['Doctors', 'delete', '/doctor/availability/{id}', 'Delete a doctor availability'],

  ['Inventory', 'get', '/inventory/items', 'Get all inventory items'],
  ['Inventory', 'post', '/inventory/items', 'Add a new inventory item'],
  ['Inventory', 'put', '/inventory/items/{id}', 'Update inventory item'],
  ['Inventory', 'get', '/inventory/requests', 'Get all purchase requests'],
  ['Inventory', 'post', '/inventory/requests', 'Create a purchase request'],
  ['Inventory', 'put', '/inventory/requests/{id}', 'Update purchase request status'],

  ['Patients', 'get', '/patient', 'Get all patients'],
  ['Patients', 'get', '/patient/{id}', 'Get a patient by ID or UHID'],
  ['Patients', 'post', '/patient', 'Register a new patient'],
  ['Patients', 'put', '/patient/{id}', 'Update patient information'],
  ['Patients', 'delete', '/patient/{id}', 'Delete a patient'],
  ['Patients', 'get', '/patient/insurance/all', 'Get all patient insurances'],
  ['Patients', 'get', '/patient/{id}/insurance', 'Get insurances by patient ID'],
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
      security: [{ 'x-role': [] }],
      parameters: parameters.length ? parameters : undefined,
      responses: { 200: { description: 'Successful response' } },
    };
  }

  paths['/'] = {
    get: { tags: [], summary: 'Health check', responses: { 200: { description: 'Hello World!' } } },
  };

  return {
    openapi: '3.0.0',
    info: {
      title: 'Hospital Management System API',
      description: 'In-memory backend for Review-4',
      version: '1.0',
    },
    components: {
      securitySchemes: {
        'x-role': { type: 'apiKey', name: 'x-role', in: 'header' },
      },
    },
    paths,
  };
}

function setupSwagger(app) {
  const document = buildDocument();
  app.use('/api', swaggerUi.serve, swaggerUi.setup(document));

  const docsPath = path.resolve(__dirname, '../../docs');
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath);
  }
  fs.writeFileSync(path.join(docsPath, 'swagger.json'), JSON.stringify(document, null, 2));
}

module.exports = { setupSwagger };
