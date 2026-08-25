'use strict';

const fs = require('fs');
const request = require('supertest');
const { createApp } = require('../app');
const { flushLogs, ACCESS_LOG_PATH, ERROR_LOG_PATH } = require('../utils/logManager');
const { createSession } = require('../store/sessionStore');

describe('FDFED Mandatory Middleware & Log Management Evaluation Suite', () => {
  let app;
  let testToken;

  beforeAll(() => {
    app = createApp();
    testToken = createSession({
      userId: 101,
      role: 'Admin',
      organizationId: 1,
      hospitalId: 1,
    });
  });

  describe('1. Logging Middleware & Log File Management', () => {
    it('should log HTTP requests to console and write access logs to disk file (logs/access.log)', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);

      // Force flush logs to disk
      flushLogs();

      expect(fs.existsSync(ACCESS_LOG_PATH)).toBe(true);
      const accessLogContent = fs.readFileSync(ACCESS_LOG_PATH, 'utf8');
      expect(accessLogContent).toContain('GET /');
      expect(accessLogContent).toContain('200');
    });

    it('should provide system log files status via log management endpoint', async () => {
      const res = await request(app)
        .get('/uploads/system/logs-status')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.accessLog.exists).toBe(true);
      expect(res.body.logs.accessLog.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('2. Error Handling Middleware & Error Log Management', () => {
    it('should catch 404 not found routes cleanly with standardized JSON response', async () => {
      const res = await request(app).get('/non-existent-route-xyz');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });

    it('should catch malformed JSON and return 400 Bad Request error response', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid-json-payload ');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.message).toContain('JSON');

      // Verify error logged to error.log
      flushLogs();
      expect(fs.existsSync(ERROR_LOG_PATH)).toBe(true);
      const errorLogContent = fs.readFileSync(ERROR_LOG_PATH, 'utf8');
      expect(errorLogContent).toContain('JSON');
    });
  });

  describe('3. File Upload Middleware', () => {
    it('should upload a patient document (PDF/Image) using multer middleware', async () => {
      const dummyPdfContent = Buffer.from('%PDF-1.4 dummy test document content');

      const res = await request(app)
        .post('/uploads/document')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('document', dummyPdfContent, 'insurance_card.pdf');

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Document uploaded successfully');
      expect(res.body.file).toBeDefined();
      expect(res.body.file.filename).toMatch(/^documents-/);
      expect(res.body.file.mimetype).toBe('application/pdf');

      // Test retrieving the uploaded file
      const downloadRes = await request(app).get(
        `/uploads/documents/${res.body.file.filename}`,
      );
      expect(downloadRes.status).toBe(200);
    });

    it('should upload hospital branding logo using multer middleware', async () => {
      const dummyPngContent = Buffer.from('dummy png content data');

      const res = await request(app)
        .post('/uploads/branding')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('logo', dummyPngContent, 'hospital_logo.png');

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Branding logo uploaded successfully');
      expect(res.body.file.category).toBe('branding');
    });

    it('should reject file upload with invalid MIME type (e.g. executable .exe)', async () => {
      const dummyExeContent = Buffer.from('MZ executable binary');

      const res = await request(app)
        .post('/uploads/document')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('document', dummyExeContent, 'dangerous_script.exe');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid file type');
    });

    it('should return 400 when no file is attached in multipart upload', async () => {
      const res = await request(app)
        .post('/uploads/document')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No document file provided');
    });
  });

  describe('4. Security Middleware', () => {
    it('should include Helmet HTTP security headers in responses', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should sanitize input strings against script tag injection', async () => {
      const res = await request(app)
        .post('/marketplace/register-organization')
        .send({
          name: 'Security Test Hospital <script>alert("xss")</script>',
          city: 'Pune',
          phone: '+91 9999988888',
          admin_name: 'Admin <script>bad()</script>',
          admin_email: 'admin.sec@test.com',
          admin_password: 'Password@123',
          plan_id: 1,
        });

      // The name should be sanitized without <script> tags
      if (res.status === 201) {
        expect(res.body.provisioned.organization.name).not.toContain('<script>');
      }
    });
  });

  describe('5. Router-Level Middleware Chains', () => {
    it('should reject requests lacking session authorization on protected routes (requireSession)', async () => {
      const res = await request(app).post('/uploads/document');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication required');
    });

    it('should validate request body schema (validateBody)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'not-an-email' }); // Missing password

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });
  });
});
