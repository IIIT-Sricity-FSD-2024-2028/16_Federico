'use strict';

const BaseRepository = require('./BaseRepository');

class ActivityLogRepository extends BaseRepository {
  constructor() {
    super('activityLog', 'log_id');
  }

  logActivity(action, performedBy, details = null, organizationId = null) {
    return this.create({
      action,
      performed_by: performedBy,
      details,
      organization_id: organizationId,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new ActivityLogRepository();
