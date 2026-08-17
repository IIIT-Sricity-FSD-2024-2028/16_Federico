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

describe('Phase 2 — real auth and actor permissions (e2e)', () => {
  const app = createApp();

  it('rejects bad credentials with 401', () => {
    return request(app)
      .post('/auth/login')
      .send({ email: 'admin@hosp.com', password: 'wrong' })
      .expect(401);
  });

  it('logs in each seeded actor and issues a usable session token', async () => {
    const hom = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@hosp.com', password: 'Hom@123' })
      .expect(200);
    if (hom.body.role !== 'HOM') throw new Error('Expected HOM role');

    const pre = await request(app)
      .post('/auth/login')
      .send({ email: 'rekha.pre@hosp.com', password: 'Pre@123' })
      .expect(200);
    if (pre.body.role !== 'PRE') throw new Error('Expected PRE role');

    // PRE can create a pre-request via session auth alone (no x-role header)
    const created = await request(app)
      .post('/pre-requests')
      .set('Authorization', `Bearer ${pre.body.token}`)
      .send({ patient_id: 201, department: 'Cardiology', visit_type: 'ADMIT' })
      .expect(201);
    if (created.body.status !== 'PENDING') throw new Error('Expected PENDING status on create');

    // HOM (not FA/PRE) can read it back
    await request(app)
      .get('/pre-requests')
      .set('Authorization', `Bearer ${hom.body.token}`)
      .expect(200);
  });

  it('denies an actor writing outside their SRS responsibility (FA creating a pre-request)', async () => {
    const fa = await request(app)
      .post('/auth/login')
      .send({ email: 'farah.fa@hosp.com', password: 'Fa@123' })
      .expect(200);

    await request(app)
      .post('/pre-requests')
      .set('Authorization', `Bearer ${fa.body.token}`)
      .send({ patient_id: 201, department: 'Cardiology', visit_type: 'ADMIT' })
      .expect(403);
  });

  it('prevents a patient from reading another patient\'s bills', async () => {
    const patient = await request(app)
      .post('/auth/login')
      .send({ email: 'hamiz@hosp.com', password: 'Hamiz@123' })
      .expect(200);
    if (patient.body.patient.patient_id !== 201) throw new Error('Expected patient_id 201');

    await request(app)
      .get('/billing/patient/202/bills')
      .set('Authorization', `Bearer ${patient.body.token}`)
      .expect(403);

    await request(app)
      .get('/billing/patient/201/bills')
      .set('Authorization', `Bearer ${patient.body.token}`)
      .expect(200);
  });
});
