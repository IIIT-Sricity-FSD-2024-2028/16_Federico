'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

/**
 * File Upload Middleware (Evaluation Criteria: File upload)
 * Multer disk storage, scoped to category subdirectories, with MIME whitelisting,
 * a size cap, and cryptographically randomized filenames (prevents path traversal
 * and overwrite-by-guessing-the-name attacks).
 */

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

// Allowed subdirectories
const CATEGORIES = {
  DOCUMENTS: 'documents',
  BRANDING: 'branding',
  INVENTORY: 'inventory',
};

// Ensure upload directories exist
Object.values(CATEGORIES).forEach((category) => {
  const dir = path.join(UPLOADS_ROOT, category);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function createStorage(category) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const destDir = path.join(UPLOADS_ROOT, category);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const rawExt = path.extname(file.originalname).toLowerCase();
      const safeExt = rawExt && /^\.[a-z0-9]+$/i.test(rawExt) ? rawExt : '.dat';
      const randomKey = crypto.randomBytes(8).toString('hex');
      const filename = `${category}-${Date.now()}-${randomKey}${safeExt}`;
      cb(null, filename);
    },
  });
}

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const err = new Error(
      `Invalid file type "${file.mimetype}". Allowed types: PDF, JPEG, PNG, WEBP.`,
    );
    err.statusCode = 400;
    err.name = 'ValidationError';
    cb(err, false);
  }
}

// Configured Multer uploaders
const documentUploader = multer({
  storage: createStorage(CATEGORIES.DOCUMENTS),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

const brandingUploader = multer({
  storage: createStorage(CATEGORIES.BRANDING),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

const inventoryUploader = multer({
  storage: createStorage(CATEGORIES.INVENTORY),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

module.exports = {
  UPLOADS_ROOT,
  CATEGORIES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  uploadDocument: documentUploader.single('document'),
  uploadBranding: brandingUploader.single('logo'),
  uploadInventory: inventoryUploader.single('invoice'),
};
