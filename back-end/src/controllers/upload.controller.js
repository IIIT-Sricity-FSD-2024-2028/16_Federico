'use strict';

const path = require('path');
const fs = require('fs');
const { UPLOADS_ROOT, CATEGORIES } = require('../middleware/fileUpload');
const { getLogFilesInfo } = require('../utils/logManager');

function handleDocumentUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: 'No document file provided in request (field name: "document")',
    });
  }

  const fileUrl = `/api/uploads/documents/${req.file.filename}`;
  res.status(201).json({
    statusCode: 201,
    message: 'Document uploaded successfully',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      category: 'documents',
      mimetype: req.file.mimetype,
      sizeBytes: req.file.size,
      url: fileUrl,
      uploadedAt: new Date().toISOString(),
    },
  });
}

function handleBrandingUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: 'No logo file provided in request (field name: "logo")',
    });
  }

  const fileUrl = `/api/uploads/branding/${req.file.filename}`;
  res.status(201).json({
    statusCode: 201,
    message: 'Branding logo uploaded successfully',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      category: 'branding',
      mimetype: req.file.mimetype,
      sizeBytes: req.file.size,
      url: fileUrl,
      uploadedAt: new Date().toISOString(),
    },
  });
}

function handleInventoryUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: 'No invoice file provided in request (field name: "invoice")',
    });
  }

  const fileUrl = `/api/uploads/inventory/${req.file.filename}`;
  res.status(201).json({
    statusCode: 201,
    message: 'Inventory invoice uploaded successfully',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      category: 'inventory',
      mimetype: req.file.mimetype,
      sizeBytes: req.file.size,
      url: fileUrl,
      uploadedAt: new Date().toISOString(),
    },
  });
}

function serveFile(req, res) {
  const { category, filename } = req.params;

  // Validate allowed category
  if (!Object.values(CATEGORIES).includes(category)) {
    return res.status(404).json({
      statusCode: 404,
      error: 'Not Found',
      message: 'Invalid upload category',
    });
  }

  // Sanitize filename to prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOADS_ROOT, category, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      statusCode: 404,
      error: 'Not Found',
      message: 'Requested file does not exist',
    });
  }

  res.sendFile(filePath);
}

function getLogStatus(req, res) {
  const logInfo = getLogFilesInfo();
  res.status(200).json({
    statusCode: 200,
    message: 'Log and error management status',
    logs: logInfo,
  });
}

module.exports = {
  handleDocumentUpload,
  handleBrandingUpload,
  handleInventoryUpload,
  serveFile,
  getLogStatus,
};
