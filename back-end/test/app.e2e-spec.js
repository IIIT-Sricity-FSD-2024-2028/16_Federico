'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');

describe('AppController (e2e)', () => {
  const app = createApp();

  it('/ (GET)', () => {
    return request(app).get('/').expect(200).expect('Hello World!');
  });

  it('rejects protected routes without an x-role header (403)', () => {
    return request(app).get('/doctor').expect(403).expect((res) => {
      if (res.body.statusCode !== 403 || res.body.error !== 'Forbidden') {
        throw new Error('Unexpected forbidden response shape');
      }
    });
  });

  it('allows ADMIN to read doctors', () => {
    return request(app).get('/doctor').set('x-role', 'ADMIN').expect(200);
  });

  it('returns Nest-style 400 with field errors on invalid doctor payload', () => {
    return request(app)
      .post('/doctor')
      .set('x-role', 'SUPER_USER')
      .send({ name: '' })
      .expect(400)
      .expect((res) => {
        if (!Array.isArray(res.body.message)) throw new Error('Expected message array');
      });
  });

  it('returns Nest-style 404 for a genuinely unmatched route', () => {
    return request(app)
      .get('/totally-unmatched-route')
      .expect(404)
      .expect((res) => {
        if (res.body.error !== 'Not Found') throw new Error('Unexpected 404 shape');
      });
  });
});
