'use strict';

const persist = require('../store/persist');

function persistOnMutation(req, res, next) {
  res.on('finish', () => {
    if (req.method !== 'GET' && res.statusCode < 400) {
      persist.save();
    }
  });
  next();
}

module.exports = { persistOnMutation };
