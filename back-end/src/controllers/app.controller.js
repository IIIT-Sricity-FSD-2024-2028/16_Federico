'use strict';

const appService = require('../services/app.service');

function getHello(req, res) {
  res.status(200).send(appService.getHello());
}

module.exports = { getHello };
