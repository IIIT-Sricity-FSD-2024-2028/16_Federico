'use strict';

const activityService = require('../services/activity.service');
const { sendResult } = require('../utils/sendResult');
const { scopeToOrg } = require('../utils/tenant');

function findAll(req, res) {
  sendResult(res, scopeToOrg(activityService.findAll(), req), 200);
}

module.exports = { findAll };
