'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');

describe('AppController (e2e)', () => {
  const app = createApp();

  it('/ (GET)', () => {
    return request(app).get('/').expect(200).expect('Hello World!');
  });

  it('rejects protected routes without an x-role header (403)', () => {
    return request(app)
      .get('/doctor')
      .expect(403)
      .expect((res) => {
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
        if (!Array.isArray(res.body.message))
          throw new Error('Expected message array');
      });
  });

  it('returns Nest-style 404 for a genuinely unmatched route', () => {
    return request(app)
      .get('/totally-unmatched-route')
      .expect(404)
      .expect((res) => {
        if (res.body.error !== 'Not Found')
          throw new Error('Unexpected 404 shape');
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
    if (created.body.status !== 'PENDING')
      throw new Error('Expected PENDING status on create');

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

  it("prevents a patient from reading another patient's bills", async () => {
    const patient = await request(app)
      .post('/auth/login')
      .send({ email: 'hamiz@hosp.com', password: 'Hamiz@123' })
      .expect(200);
    if (patient.body.patient.patient_id !== 201)
      throw new Error('Expected patient_id 201');

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
    await request(app)
      .get('/patient/insurance/all')
      .set('Authorization', auth)
      .expect(403);
    await request(app)
      .get('/billing/payments')
      .set('Authorization', auth)
      .expect(403);
    await request(app)
      .get('/billing/receipts')
      .set('Authorization', auth)
      .expect(403);
    await request(app)
      .get('/billing/ledger/701')
      .set('Authorization', auth)
      .expect(403);
    await request(app)
      .get('/billing/ledger/801/entries')
      .set('Authorization', auth)
      .expect(403);
    // Own record must still work
    await request(app)
      .get('/patient/201')
      .set('Authorization', auth)
      .expect(200);
  });

  it("blocks a patient from reading or cancelling another patient's pre-request, and from self-approving their own", async () => {
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
      throw new Error("Patient list leaked another patient's pre-request");
    }
  });
});

describe('Phase 3 — pre-request state machine (e2e)', () => {
  const app = createApp();

  async function login(email, password) {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
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
    if (created.body.status !== 'PENDING')
      throw new Error('Expected PENDING on create');

    // FA has no business approving intake
    const fa = await login('farah.fa@hosp.com', 'Fa@123');
    await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', fa)
      .send({ status: 'APPROVED' })
      .expect(403);

    // PRE approves
    const approved = await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', pre)
      .send({ status: 'APPROVED' })
      .expect(200);
    if (approved.body.status !== 'APPROVED')
      throw new Error('Expected APPROVED');

    // ADMITTED can never be set directly, by anyone, even HOM
    await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', hom)
      .send({ status: 'ADMITTED' })
      .expect(403);

    // HOM allocates a bed via the bed-request flow — THIS drives ADMITTED
    const bedReq = await request(app)
      .post('/ward/bed-requests')
      .set('Authorization', pre)
      .send({ patient_id: 202, pre_request_id: id, ward_id: 1 })
      .expect(201);
    const beds = await request(app)
      .get('/ward/beds')
      .set('Authorization', hom)
      .expect(200);
    const freeBed = beds.body.find((b) => b.status === 'AVAILABLE');
    await request(app)
      .put(`/ward/bed-requests/${bedReq.body.bed_request_id}`)
      .set('Authorization', hom)
      .send({ bed_id: freeBed.bed_id })
      .expect(200);

    const afterAllocation = await request(app)
      .get(`/pre-requests/${id}`)
      .set('Authorization', hom)
      .expect(200);
    if (afterAllocation.body.status !== 'ADMITTED')
      throw new Error('Expected bed allocation to drive status to ADMITTED');
    if (afterAllocation.body.bed_id !== freeBed.bed_id)
      throw new Error('Expected bed_id to be set on the pre-request');

    const bedAfterAllocation = await request(app)
      .get('/ward/beds')
      .set('Authorization', hom)
      .expect(200);
    if (
      bedAfterAllocation.body.find((b) => b.bed_id === freeBed.bed_id)
        .status !== 'OCCUPIED'
    ) {
      throw new Error('Expected allocated bed to be OCCUPIED');
    }

    // PRE requests discharge — HOM cannot skip PRE and request it themselves
    await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', hom)
      .send({ status: 'DISCHARGE_REQUESTED' })
      .expect(403);
    await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', pre)
      .send({ status: 'DISCHARGE_REQUESTED' })
      .expect(200);

    // HOM coordinates and approves the discharge — PRE cannot self-approve
    await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', pre)
      .send({ status: 'DISCHARGE_APPROVED' })
      .expect(403);
    await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', hom)
      .send({ status: 'DISCHARGE_APPROVED' })
      .expect(200);

    // PRE gives the final sign-off — this must release the bed
    const discharged = await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', pre)
      .send({ status: 'DISCHARGED' })
      .expect(200);
    if (discharged.body.status !== 'DISCHARGED')
      throw new Error('Expected DISCHARGED');

    const bedAfterDischarge = await request(app)
      .get('/ward/beds')
      .set('Authorization', hom)
      .expect(200);
    if (
      bedAfterDischarge.body.find((b) => b.bed_id === freeBed.bed_id).status !==
      'AVAILABLE'
    ) {
      throw new Error(
        'Expected bed to be released (AVAILABLE) after discharge',
      );
    }
  });

  it('rejects an out-of-order transition (cannot discharge-request a request that was never admitted)', async () => {
    const pre = await login('rekha.pre@hosp.com', 'Pre@123');
    const created = await request(app)
      .post('/pre-requests')
      .set('Authorization', pre)
      .send({
        patient_id: 203,
        department: 'General Medicine',
        visit_type: 'Consultation',
      })
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
      .send({
        patient_id: 201,
        department: 'Cardiology',
        visit_type: 'Consultation',
      })
      .expect(201);
    const id = created.body.pre_request_id;

    const rescheduled = await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', pre)
      .send({ requested_date: '2026-09-01', requested_time: '11:00 AM' })
      .expect(200);
    if (rescheduled.body.requested_time !== '11:00 AM')
      throw new Error('Expected field update to apply');

    await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', patient)
      .send({ requested_date: '2026-09-02' })
      .expect(403);
  });
});

describe('Multi-tenancy — Platform Super User, organizations, feature flags, dynamic RBAC (e2e)', () => {
  const app = createApp();

  async function login(email, password) {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body;
  }

  async function platformLogin() {
    const res = await request(app)
      .post('/platform/auth/login')
      .send({
        email: 'platform@federico.com',
        password: 'Federico@Platform123',
      })
      .expect(200);
    return `Bearer ${res.body.token}`;
  }

  it('/marketplace/organizations is public and lists only ACTIVE organizations', async () => {
    const res = await request(app)
      .get('/marketplace/organizations')
      .expect(200);
    if (!Array.isArray(res.body) || res.body.length < 2)
      throw new Error('Expected at least the 2 seeded organizations');
    if (res.body.some((o) => o.status))
      throw new Error(
        'Marketplace listing must not leak internal fields like status',
      );
    if (!res.body.every((o) => o.name && o.branches))
      throw new Error('Expected name/branches on every listing');
  });

  it('Platform Super User can manage organizations but is hard-blocked from patient/billing/inventory/doctor data', async () => {
    const platform = await platformLogin();

    await request(app)
      .get('/platform/organizations')
      .set('Authorization', platform)
      .expect(200);
    await request(app)
      .get('/platform/organizations/1/usage')
      .set('Authorization', platform)
      .expect(200);

    await request(app)
      .get('/patient')
      .set('Authorization', platform)
      .expect(403);
    await request(app)
      .get('/doctor')
      .set('Authorization', platform)
      .expect(403);
    await request(app)
      .get('/billing/services')
      .set('Authorization', platform)
      .expect(403);
    await request(app)
      .get('/inventory/items')
      .set('Authorization', platform)
      .expect(403);
  });

  it('a non-platform session cannot reach /platform/* routes', async () => {
    const hom = await login('admin@hosp.com', 'Hom@123');
    await request(app)
      .get('/platform/organizations')
      .set('Authorization', `Bearer ${hom.token}`)
      .expect(403);
  });

  it('provisioning creates a new organization whose default admin can log in and immediately use it', async () => {
    const platform = await platformLogin();
    const plans = await request(app)
      .get('/platform/plans')
      .set('Authorization', platform)
      .expect(200);
    const starter = plans.body.find((p) => p.name === 'Starter');

    const provisioned = await request(app)
      .post('/platform/organizations')
      .set('Authorization', platform)
      .send({
        name: 'Test Provisioning Hospital',
        admin_name: 'Test Admin',
        admin_email: 'admin@test-provisioning.hosp.com',
        admin_password: 'TestAdmin@123',
        plan_id: starter.plan_id,
        modules: ['APPOINTMENTS', 'ADMISSIONS'],
      })
      .expect(201);
    if (!provisioned.body.organization || !provisioned.body.apiKey)
      throw new Error('Expected organization + apiKey in provisioning result');

    const newAdmin = await login(
      'admin@test-provisioning.hosp.com',
      'TestAdmin@123',
    );
    if (
      newAdmin.tenant.organization_id !==
      provisioned.body.organization.organization_id
    ) {
      throw new Error(
        'New admin session not scoped to the newly provisioned organization',
      );
    }
    if (newAdmin.tenant.enabled_modules.includes('BILLING')) {
      throw new Error(
        'BILLING was not in the requested module list and must not be enabled',
      );
    }

    // Freshly provisioned org starts with no doctors of its own.
    const doctors = await request(app)
      .get('/doctor')
      .set('Authorization', `Bearer ${newAdmin.token}`)
      .expect(200);
    if (doctors.body.length !== 0)
      throw new Error(
        "New organization must not see another organization's doctors",
      );
  });

  it('cross-organization data is fully isolated between Federico General (org 1) and Apollo Hospitals (org 2)', async () => {
    const federicoHom = await login('admin@hosp.com', 'Hom@123');
    const apolloHom = await login('admin@apollo.hosp.com', 'Apollo@123');
    if (federicoHom.tenant.organization_id === apolloHom.tenant.organization_id)
      throw new Error('Seeded demo orgs must differ');

    const federicoDoctors = await request(app)
      .get('/doctor')
      .set('Authorization', `Bearer ${federicoHom.token}`)
      .expect(200);
    const apolloDoctors = await request(app)
      .get('/doctor')
      .set('Authorization', `Bearer ${apolloHom.token}`)
      .expect(200);
    if (
      federicoDoctors.body.some((d) =>
        apolloDoctors.body.some((ad) => ad.doctor_id === d.doctor_id),
      )
    ) {
      throw new Error('Doctor lists must not overlap between organizations');
    }

    // Apollo cannot read a Federico doctor by ID either (empty body = not-found, this app's existing convention).
    const federicoDoctorId = federicoDoctors.body[0].doctor_id;
    const crossOrgRead = await request(app)
      .get(`/doctor/${federicoDoctorId}`)
      .set('Authorization', `Bearer ${apolloHom.token}`)
      .expect(200);
    if (crossOrgRead.body && crossOrgRead.body.doctor_id)
      throw new Error(
        'Apollo must not be able to read a Federico doctor record',
      );
  });

  it('feature flags differ per organization: Apollo (INSURANCE off) is blocked, Federico General (INSURANCE on) is not', async () => {
    const federicoHom = await login('admin@hosp.com', 'Hom@123');
    const apolloHom = await login('admin@apollo.hosp.com', 'Apollo@123');

    await request(app)
      .get('/patient/insurance/all')
      .set('Authorization', `Bearer ${federicoHom.token}`)
      .expect(200);
    await request(app)
      .get('/patient/insurance/all')
      .set('Authorization', `Bearer ${apolloHom.token}`)
      .expect(403);

    // Apollo's plan also excludes INVENTORY.
    await request(app)
      .get('/inventory/items')
      .set('Authorization', `Bearer ${apolloHom.token}`)
      .expect(403);
  });

  it('dynamic RBAC: a PRE account with no fixed billing access gets billing:read via a custom role', async () => {
    const plainPre = await login('rekha.pre@hosp.com', 'Pre@123');
    await request(app)
      .get('/billing/services')
      .set('Authorization', `Bearer ${plainPre.token}`)
      .expect(403);

    const billingAssist = await login('billing.assist@hosp.com', 'Assist@123');
    if (billingAssist.role !== 'PRE')
      throw new Error(
        'Expected the RBAC demo account to still be a fixed PRE actor',
      );
    await request(app)
      .get('/billing/services')
      .set('Authorization', `Bearer ${billingAssist.token}`)
      .expect(200);

    // The grant must not leak into billing WRITE (only billing:read was assigned).
    await request(app)
      .post('/billing/services')
      .set('Authorization', `Bearer ${billingAssist.token}`)
      .send({ service_name: 'Should Be Blocked', base_cost: 100 })
      .expect(403);
  });

  it('legacy x-role-only callers keep seeing organization 1 exactly as before (backward compatibility)', async () => {
    const res = await request(app)
      .get('/doctor')
      .set('x-role', 'ADMIN')
      .expect(200);
    if (res.body.some((d) => d.organization_id !== 1))
      throw new Error('Legacy caller must only see organization 1 data');
  });
});
