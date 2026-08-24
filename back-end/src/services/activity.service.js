'use strict';

const { activityLogRepository } = require('../repositories');

function log(type, text, meta, organizationId) {
  const entry = activityLogRepository.create({
    type: type || 'info',
    text: text || '',
    meta: meta || null,
    organization_id: organizationId ? Number(organizationId) : null,
  });
  return entry;
}

function findAll() {
  return activityLogRepository.findAll();
}

module.exports = { log, findAll };
