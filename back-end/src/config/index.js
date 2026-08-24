'use strict';

/**
 * @module config
 * Application Configuration Subsystem
 *
 * Exports:
 * - `env`: 12-factor environment variables and runtime settings.
 * - `defaultClinicalCatalog`: Immutable baseline department, ward, and inventory catalog.
 * - `setupSwagger`: OpenAPI 3.0 route documentation and Swagger UI setup.
 */

const env = require('./env');
const { DEFAULT_DEPARTMENTS, DEFAULT_INVENTORY_ITEMS } = require('./defaultClinicalCatalog');
const { setupSwagger, buildDocument } = require('./swagger');

module.exports = {
  env,
  DEFAULT_DEPARTMENTS,
  DEFAULT_INVENTORY_ITEMS,
  setupSwagger,
  buildDocument,
};
