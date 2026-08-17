'use strict';

const activityService = require('../services/activity.service');
const { sendResult } = require('../utils/sendResult');

function findAll(req, res) {
  sendResult(res, activityService.findAll(), 200);
}

module.exports = { findAll };
