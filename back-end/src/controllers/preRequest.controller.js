'use strict';

const preRequestService = require('../services/preRequest.service');
const { sendResult } = require('../utils/sendResult');

function findAll(req, res) {
  sendResult(res, preRequestService.findAll(), 200);
}

function findOne(req, res) {
  sendResult(res, preRequestService.findOne(+req.params.id), 200);
}

function create(req, res) {
  const createdBy = req.session ? req.session.userId : null;
  sendResult(res, preRequestService.create(req.body, createdBy), 201);
}

function update(req, res) {
  sendResult(res, preRequestService.update(+req.params.id, req.body), 200);
}

module.exports = { findAll, findOne, create, update };
