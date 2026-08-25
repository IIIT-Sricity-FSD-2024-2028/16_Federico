'use strict';

const path = require('path');
const fs = require('fs');
const { UPLOADS_ROOT, CATEGORIES } = require('../middleware/fileUpload');
const { getLogFilesInfo } = require('../utils/logManager');
const { ValidationError, NotFoundError } = require('../errors');
const { sendSuccess, sendError } = require('../utils/response');

function buildFileResponse(req, res, { category, fieldLabel }) {
  if (!req.file) {
    return sendError(
      res,
      new ValidationError(
        `No ${fieldLabel} file provided in request (field name: "${fieldLabel}")`,
      ),
      400,
    );
  }

  return sendSuccess(
    res,
    {
      originalName: req.file.originalname,
      filename: req.file.filename,
      category,
      mimetype: req.file.mimetype,
      sizeBytes: req.file.size,
      url: `/uploads/${category}/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
    },
    201,
  );
}

function handleDocumentUpload(req, res) {
  return buildFileResponse(req, res, {
    category: CATEGORIES.DOCUMENTS,
    fieldLabel: 'document',
  });
}

function handleBrandingUpload(req, res) {
  return buildFileResponse(req, res, {
    category: CATEGORIES.BRANDING,
    fieldLabel: 'logo',
  });
}

function handleInventoryUpload(req, res) {
  return buildFileResponse(req, res, {
    category: CATEGORIES.INVENTORY,
    fieldLabel: 'invoice',
  });
}

function serveFile(req, res) {
  const { category, filename } = req.params;

  if (!Object.values(CATEGORIES).includes(category)) {
    return sendError(res, new NotFoundError('Invalid upload category'), 404);
  }

  // path.basename strips any directory segments, blocking path traversal via filename.
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOADS_ROOT, category, safeFilename);

  if (!fs.existsSync(filePath)) {
    return sendError(
      res,
      new NotFoundError('Requested file does not exist'),
      404,
    );
  }

  res.sendFile(filePath);
}

function getLogStatus(req, res) {
  sendSuccess(res, getLogFilesInfo(), 200);
}

module.exports = {
  handleDocumentUpload,
  handleBrandingUpload,
  handleInventoryUpload,
  serveFile,
  getLogStatus,
};
