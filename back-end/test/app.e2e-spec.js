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

  it('blocks a patient from every list-all-patients/payments/receipts endpoint', async () => {
    const patient = await request(app)
      .post('/auth/login')
      .send({ email: 'hamiz@hosp.com', password: 'Hamiz@123' })
      .expect(200);
    const auth = `Bearer ${patient.body.token}`;

    await request(app).get('/patient').set('Authorization', auth).expect(403);
    await request(app).get('/patient/insurance/all').set('Authorization', auth).expect(403);
    await request(app).get('/billing/payments').set('Authorization', auth).expect(403);
    await request(app).get('/billing/receipts').set('Authorization', auth).expect(403);
    await request(app).get('/billing/ledger/701').set('Authorization', auth).expect(403);
    await request(app).get('/billing/ledger/801/entries').set('Authorization', auth).expect(403);
    // Own record must still work
    await request(app).get('/patient/201').set('Authorization', auth).expect(200);
  });

  it('blocks a patient from reading or cancelling another patient\'s pre-request, and from self-approving their own', async () => {
    const pre = await request(app)
      .post('/auth/login')
      .send({ email: 'rekha.pre@hosp.com', password: 'Pre@123' })
      .expect(200);
    const owned = await request(app)
      .post('/pre-requests')
      .set('Authorization', `Bearer ${pre.body.token}`)
      .send({ patient_id: 201, department: 'Cardiology', visit_type: 'ADMIT' })
      .expect(201);

    const otherPatient = await request(app)
      .post('/auth/login')
      .send({ email: 'salma@hosp.com', password: 'Salma@123' })
      .expect(200);
    const owningPatient = await request(app)
      .post('/auth/login')
      .send({ email: 'hamiz@hosp.com', password: 'Hamiz@123' })
      .expect(200);

    // A different patient can neither see nor cancel it
    await request(app)
      .get(`/pre-requests/${owned.body.pre_request_id}`)
      .set('Authorization', `Bearer ${otherPatient.body.token}`)
      .expect(403);
    await request(app)
      .put(`/pre-requests/${owned.body.pre_request_id}`)
      .set('Authorization', `Bearer ${otherPatient.body.token}`)
      .send({ status: 'REJECTED', reject_reason: 'not mine' })
      .expect(403);

    // The owning patient cannot self-approve/self-admit or assign a bed —
    // only cancel (status: REJECTED) is allowed from a Patient session.
    await request(app)
      .put(`/pre-requests/${owned.body.pre_request_id}`)
      .set('Authorization', `Bearer ${owningPatient.body.token}`)
      .send({ status: 'ADMITTED', bed_id: 22 })
      .expect(403);

    // But the owning patient CAN cancel their own pending request
    await request(app)
      .put(`/pre-requests/${owned.body.pre_request_id}`)
      .set('Authorization', `Bearer ${owningPatient.body.token}`)
      .send({ status: 'REJECTED', reject_reason: 'Changed my mind' })
      .expect(200);
  });

  it('lets a patient see only their own pre-requests in the list', async () => {
    const pre = await request(app)
      .post('/auth/login')
      .send({ email: 'rekha.pre@hosp.com', password: 'Pre@123' })
      .expect(200);
    await request(app)
      .post('/pre-requests')
      .set('Authorization', `Bearer ${pre.body.token}`)
      .send({ patient_id: 202, department: 'Neurology', visit_type: 'OPD' })
      .expect(201);

    const patient201 = await request(app)
      .post('/auth/login')
      .send({ email: 'hamiz@hosp.com', password: 'Hamiz@123' })
      .expect(200);
    const list = await request(app)
      .get('/pre-requests')
      .set('Authorization', `Bearer ${patient201.body.token}`)
      .expect(200);

    if (list.body.some((pr) => pr.patient_id !== 201)) {
      throw new Error('Patient list leaked another patient\'s pre-request');
    }
  });
});

describe('Phase 3 — pre-request state machine (e2e)', () => {
  const app = createApp();

  async function login(email, password) {
    const res = await request(app).post('/auth/login').send({ email, password }).expect(200);
    return `Bearer ${res.body.token}`;
  }

  it('walks the full Admit lifecycle end to end with the correct actor at each step, and releases the bed on discharge', async () => {
    const pre = await login('rekha.pre@hosp.com', 'Pre@123');
    const hom = await login('admin@hosp.com', 'Hom@123');

    const created = await request(app)
      .post('/pre-requests')
      .set('Authorization', pre)
      .send({ patient_id: 202, department: 'Orthopedics', visit_type: 'Admit' })
      .expect(201);
    const id = created.body.pre_request_id;
    if (created.body.status !== 'PENDING') throw new Error('Expected PENDING on create');

    // FA has no business approving intake
    const fa = await login('farah.fa@hosp.com', 'Fa@123');
    await request(app).put(`/pre-requests/${id}`).set('Authorization', fa).send({ status: 'APPROVED' }).expect(403);

    // PRE approves
    const approved = await request(app).put(`/pre-requests/${id}`).set('Authorization', pre).send({ status: 'APPROVED' }).expect(200);
    if (approved.body.status !== 'APPROVED') throw new Error('Expected APPROVED');

    // ADMITTED can never be set directly, by anyone, even HOM
    await request(app).put(`/pre-requests/${id}`).set('Authorization', hom).send({ status: 'ADMITTED' }).expect(403);

    // HOM allocates a bed via the bed-request flow — THIS drives ADMITTED
    const bedReq = await request(app)
      .post('/ward/bed-requests')
      .set('Authorization', pre)
      .send({ patient_id: 202, pre_request_id: id, ward_id: 1 })
      .expect(201);
    const beds = await request(app).get('/ward/beds').set('Authorization', hom).expect(200);
    const freeBed = beds.body.find((b) => b.status === 'AVAILABLE');
    await request(app)
      .put(`/ward/bed-requests/${bedReq.body.bed_request_id}`)
      .set('Authorization', hom)
      .send({ bed_id: freeBed.bed_id })
      .expect(200);

    const afterAllocation = await request(app).get(`/pre-requests/${id}`).set('Authorization', hom).expect(200);
    if (afterAllocation.body.status !== 'ADMITTED') throw new Error('Expected bed allocation to drive status to ADMITTED');
    if (afterAllocation.body.bed_id !== freeBed.bed_id) throw new Error('Expected bed_id to be set on the pre-request');

    const bedAfterAllocation = await request(app).get('/ward/beds').set('Authorization', hom).expect(200);
    if (bedAfterAllocation.body.find((b) => b.bed_id === freeBed.bed_id).status !== 'OCCUPIED') {
      throw new Error('Expected allocated bed to be OCCUPIED');
    }

    // PRE requests discharge — HOM cannot skip PRE and request it themselves
    await request(app).put(`/pre-requests/${id}`).set('Authorization', hom).send({ status: 'DISCHARGE_REQUESTED' }).expect(403);
    await request(app).put(`/pre-requests/${id}`).set('Authorization', pre).send({ status: 'DISCHARGE_REQUESTED' }).expect(200);

    // HOM coordinates and approves the discharge — PRE cannot self-approve
    await request(app).put(`/pre-requests/${id}`).set('Authorization', pre).send({ status: 'DISCHARGE_APPROVED' }).expect(403);
    await request(app).put(`/pre-requests/${id}`).set('Authorization', hom).send({ status: 'DISCHARGE_APPROVED' }).expect(200);

    // PRE gives the final sign-off — this must release the bed
    const discharged = await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', pre)
      .send({ status: 'DISCHARGED' })
      .expect(200);
    if (discharged.body.status !== 'DISCHARGED') throw new Error('Expected DISCHARGED');

    const bedAfterDischarge = await request(app).get('/ward/beds').set('Authorization', hom).expect(200);
    if (bedAfterDischarge.body.find((b) => b.bed_id === freeBed.bed_id).status !== 'AVAILABLE') {
      throw new Error('Expected bed to be released (AVAILABLE) after discharge');
    }
  });

  it('rejects an out-of-order transition (cannot discharge-request a request that was never admitted)', async () => {
    const pre = await login('rekha.pre@hosp.com', 'Pre@123');
    const created = await request(app)
      .post('/pre-requests')
      .set('Authorization', pre)
      .send({ patient_id: 203, department: 'General Medicine', visit_type: 'Consultation' })
      .expect(201);

    await request(app)
      .put(`/pre-requests/${created.body.pre_request_id}`)
      .set('Authorization', pre)
      .send({ status: 'DISCHARGE_REQUESTED' })
      .expect(403);
  });

  it('lets PRE reschedule (field update) but blocks Patient from the same endpoint', async () => {
    const pre = await login('rekha.pre@hosp.com', 'Pre@123');
    const patient = await login('hamiz@hosp.com', 'Hamiz@123');

    const created = await request(app)
      .post('/pre-requests')
      .set('Authorization', pre)
      .send({ patient_id: 201, department: 'Cardiology', visit_type: 'Consultation' })
      .expect(201);
    const id = created.body.pre_request_id;

    const rescheduled = await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', pre)
      .send({ requested_date: '2026-09-01', requested_time: '11:00 AM' })
      .expect(200);
    if (rescheduled.body.requested_time !== '11:00 AM') throw new Error('Expected field update to apply');

    await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', patient)
      .send({ requested_date: '2026-09-02' })
      .expect(403);
  });
});
