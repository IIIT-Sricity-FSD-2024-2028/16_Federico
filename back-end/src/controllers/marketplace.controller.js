'use strict';

const organizationService = require('../services/organization.service');

/**
 * Organization Marketplace (tasks.md §4) — deliberately the only endpoint
 * in this whole app with no auth gate at all. A patient must be able to
 * browse participating hospitals before they have any account anywhere.
 * Only ACTIVE organizations are listed (see organizationService.marketplaceListing),
 * and only the public fields tasks.md §4 names — never internal fields
 * like quotas, subscriptions, or API keys.
 */
function listOrganizations(req, res) {
  res.status(200).json(organizationService.marketplaceListing());
}

module.exports = { listOrganizations };
