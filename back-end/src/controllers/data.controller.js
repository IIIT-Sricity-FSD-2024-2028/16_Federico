'use strict';

const dataService = require('../services/data.service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('🔄 DataSync');

function getFullState(req, res) {
  logger.log('📤 STATE PULLED');
  res.status(200).json(dataService.getFullState());
}

function updateFullState(req, res) {
  const { changed } = dataService.updateFullState(req.body || {});
  logger.log(`📥 STATE PUSHED  | updated: ${changed.join(', ') || 'nothing'}`);
  // Original NestJS DataController only ever returns { success: true } —
  // `changed` is logged server-side, never part of the response body.
  res.status(201).json({ success: true });
}

module.exports = { getFullState, updateFullState };
