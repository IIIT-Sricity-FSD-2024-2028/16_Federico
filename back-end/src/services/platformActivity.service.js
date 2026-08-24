'use strict';

const { organizationRepository } = require('../repositories');

function log(platformUserId, action, targetOrganizationId, details) {
  return organizationRepository.logPlatformActivity({
    platform_user_id: platformUserId ? Number(platformUserId) : null,
    action,
    target_organization_id: targetOrganizationId ? Number(targetOrganizationId) : null,
    details: details || null,
  });
}

function findAll() {
  return organizationRepository.findAllPlatformActivity();
}

module.exports = { log, findAll };
