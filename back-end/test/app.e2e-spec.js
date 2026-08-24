'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');

function b(res) {
  if (!res) return res;
  const body = res.body !== undefined ? res.body : res;
  if (body && typeof body === 'object' && 'data' in body && 'success' in body) {
    return body.data !== null && body.data !== undefined ? body.data : body;
  }
  return body;
}

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
        if (res.body.statusCode !== 403 || (res.body.error !== 'Forbidden' && (!res.body.error || res.body.error.code !== 'FORBIDDEN'))) {
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
        if (res.body.error !== 'Not Found' && (!res.body.error || res.body.error.code !== 'NOT_FOUND'))
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
    if (b(hom).role !== 'HOM') throw new Error('Expected HOM role');

    const pre = await request(app)
      .post('/auth/login')
      .send({ email: 'rekha.pre@hosp.com', password: 'Pre@123' })
      .expect(200);
    if (b(pre).role !== 'PRE') throw new Error('Expected PRE role');

    // PRE can create a pre-request via session auth alone (no x-role header)
    const created = await request(app)
      .post('/pre-requests')
      .set('Authorization', `Bearer ${b(pre).token}`)
      .send({ patient_id: 201, department: 'Cardiology', visit_type: 'ADMIT' })
      .expect(201);
    if (b(created).status !== 'PENDING')
      throw new Error('Expected PENDING status on create');

    // HOM (not FA/PRE) can read it back
    await request(app)
      .get('/pre-requests')
      .set('Authorization', `Bearer ${b(hom).token}`)
      .expect(200);
  });

  it('denies an actor writing outside their SRS responsibility (FA creating a pre-request)', async () => {
    const fa = await request(app)
      .post('/auth/login')
      .send({ email: 'farah.fa@hosp.com', password: 'Fa@123' })
      .expect(200);

    await request(app)
      .post('/pre-requests')
      .set('Authorization', `Bearer ${b(fa).token}`)
      .send({ patient_id: 201, department: 'Cardiology', visit_type: 'ADMIT' })
      .expect(403);
  });

  it("prevents a patient from reading another patient's bills", async () => {
    const patient = await request(app)
      .post('/auth/login')
      .send({ email: 'arjun.k@hosp.com', password: 'Hamiz@123' })
      .expect(200);
    if (b(patient).patient.patient_id !== 201)
      throw new Error('Expected patient_id 201');

    await request(app)
      .get('/billing/patient/202/bills')
      .set('Authorization', `Bearer ${b(patient).token}`)
      .expect(403);

    await request(app)
      .get('/billing/patient/201/bills')
      .set('Authorization', `Bearer ${b(patient).token}`)
      .expect(200);
  });

  it('blocks a patient from every list-all-patients/payments/receipts endpoint', async () => {
    const patient = await request(app)
      .post('/auth/login')
      .send({ email: 'arjun.k@hosp.com', password: 'Hamiz@123' })
      .expect(200);
    const auth = `Bearer ${b(patient).token}`;

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
      .set('Authorization', `Bearer ${b(pre).token}`)
      .send({ patient_id: 201, department: 'Cardiology', visit_type: 'ADMIT' })
      .expect(201);

    const otherPatient = await request(app)
      .post('/auth/login')
      .send({ email: 'priyanka.n@hosp.com', password: 'Salma@123' })
      .expect(200);
    const owningPatient = await request(app)
      .post('/auth/login')
      .send({ email: 'arjun.k@hosp.com', password: 'Hamiz@123' })
      .expect(200);

    // A different patient can neither see nor cancel it
    await request(app)
      .get(`/pre-requests/${b(owned).pre_request_id}`)
      .set('Authorization', `Bearer ${b(otherPatient).token}`)
      .expect(403);
    await request(app)
      .put(`/pre-requests/${b(owned).pre_request_id}`)
      .set('Authorization', `Bearer ${b(otherPatient).token}`)
      .send({ status: 'REJECTED', reject_reason: 'not mine' })
      .expect(403);

    // The owning patient cannot self-approve/self-admit or assign a bed —
    // only cancel (status: REJECTED) is allowed from a Patient session.
    await request(app)
      .put(`/pre-requests/${b(owned).pre_request_id}`)
      .set('Authorization', `Bearer ${b(owningPatient).token}`)
      .send({ status: 'ADMITTED', bed_id: 22 })
      .expect(403);

    // But the owning patient CAN cancel their own pending request
    await request(app)
      .put(`/pre-requests/${b(owned).pre_request_id}`)
      .set('Authorization', `Bearer ${b(owningPatient).token}`)
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
      .set('Authorization', `Bearer ${b(pre).token}`)
      .send({ patient_id: 202, department: 'Neurology', visit_type: 'OPD' })
      .expect(201);

    const patient201 = await request(app)
      .post('/auth/login')
      .send({ email: 'arjun.k@hosp.com', password: 'Hamiz@123' })
      .expect(200);
    const list = await request(app)
      .get('/pre-requests')
      .set('Authorization', `Bearer ${b(patient201).token}`)
      .expect(200);

    if (b(list).some((pr) => pr.patient_id !== 201)) {
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
    const id = b(created).pre_request_id;
    if (b(created).status !== 'PENDING')
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
    if (b(approved).status !== 'APPROVED')
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
    const freeBed = b(beds).find((b) => b.status === 'AVAILABLE');
    await request(app)
      .put(`/ward/bed-requests/${b(bedReq).bed_request_id}`)
      .set('Authorization', hom)
      .send({ bed_id: freeBed.bed_id })
      .expect(200);

    const afterAllocation = await request(app)
      .get(`/pre-requests/${id}`)
      .set('Authorization', hom)
      .expect(200);
    if (b(afterAllocation).status !== 'ADMITTED')
      throw new Error('Expected bed allocation to drive status to ADMITTED');
    if (b(afterAllocation).bed_id !== freeBed.bed_id)
      throw new Error('Expected bed_id to be set on the pre-request');

    const bedAfterAllocation = await request(app)
      .get('/ward/beds')
      .set('Authorization', hom)
      .expect(200);
    if (
      b(bedAfterAllocation).find((b) => b.bed_id === freeBed.bed_id)
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
    if (b(discharged).status !== 'DISCHARGED')
      throw new Error('Expected DISCHARGED');

    const bedAfterDischarge = await request(app)
      .get('/ward/beds')
      .set('Authorization', hom)
      .expect(200);
    if (
      b(bedAfterDischarge).find((b) => b.bed_id === freeBed.bed_id).status !==
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
      .put(`/pre-requests/${b(created).pre_request_id}`)
      .set('Authorization', pre)
      .send({ status: 'DISCHARGE_REQUESTED' })
      .expect(403);
  });

  it('lets PRE reschedule (field update) but blocks Patient from the same endpoint', async () => {
    const pre = await login('rekha.pre@hosp.com', 'Pre@123');
    const patient = await login('arjun.k@hosp.com', 'Hamiz@123');

    const created = await request(app)
      .post('/pre-requests')
      .set('Authorization', pre)
      .send({
        patient_id: 201,
        department: 'Cardiology',
        visit_type: 'Consultation',
      })
      .expect(201);
    const id = b(created).pre_request_id;

    const rescheduled = await request(app)
      .put(`/pre-requests/${id}`)
      .set('Authorization', pre)
      .send({ requested_date: '2026-09-01', requested_time: '11:00 AM' })
      .expect(200);
    if (b(rescheduled).requested_time !== '11:00 AM')
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
    if (!Array.isArray(b(res)) || b(res).length < 2)
      throw new Error('Expected at least the 2 seeded organizations');
    if (b(res).some((o) => o.status))
      throw new Error(
        'Marketplace listing must not leak internal fields like status',
      );
    if (!b(res).every((o) => o.name && o.branches))
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
    const starter = b(plans).find((p) => p.name === 'Starter');

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
    if (!b(provisioned).organization || !b(provisioned).apiKey)
      throw new Error('Expected organization + apiKey in provisioning result');

    const newAdmin = await login(
      'admin@test-provisioning.hosp.com',
      'TestAdmin@123',
    );
    if (
      newAdmin.tenant.organization_id !==
      b(provisioned).organization.organization_id
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
    if (b(doctors).length !== 0)
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
      b(federicoDoctors).some((d) =>
        b(apolloDoctors).some((ad) => ad.doctor_id === d.doctor_id),
      )
    ) {
      throw new Error('Doctor lists must not overlap between organizations');
    }

    // Apollo cannot read a Federico doctor by ID either (empty body = not-found, this app's existing convention).
    const federicoDoctorId = b(federicoDoctors)[0].doctor_id;
    const crossOrgRead = await request(app)
      .get(`/doctor/${federicoDoctorId}`)
      .set('Authorization', `Bearer ${apolloHom.token}`)
      .expect(200);
    if (b(crossOrgRead) && b(crossOrgRead).doctor_id)
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
    if (b(res).some((d) => d.organization_id !== 1))
      throw new Error('Legacy caller must only see organization 1 data');
  });
});

describe('Admin role — org-wide analytics, wardAdmin/inventoryCatalog, RBAC ownership (e2e)', () => {
  const app = createApp();

  async function login(email, password) {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body;
  }

  it('the seeded Admin account logs in as Admin, distinct from the seeded HOM account', async () => {
    const admin = await login('owner@hosp.com', 'Owner@123');
    if (admin.role !== 'Admin') throw new Error('Expected Admin role');

    const hom = await login('admin@hosp.com', 'Hom@123');
    if (hom.role !== 'HOM') throw new Error('Expected HOM role');
  });

  it('Admin — not HOM — can create, resize, and delete a ward', async () => {
    const admin = await login('owner@hosp.com', 'Owner@123');
    const hom = await login('admin@hosp.com', 'Hom@123');
    const adminAuth = `Bearer ${admin.token}`;
    const homAuth = `Bearer ${hom.token}`;

    await request(app)
      .post('/ward')
      .set('Authorization', homAuth)
      .send({ ward_name: 'HOM Should Not Create This', total_beds: 2 })
      .expect(403);

    const created = await request(app)
      .post('/ward')
      .set('Authorization', adminAuth)
      .send({ ward_name: 'e2e Test Ward', total_beds: 2 })
      .expect(201);
    const wardId = b(created).ward_id;

    await request(app)
      .put(`/ward/${wardId}`)
      .set('Authorization', adminAuth)
      .send({ total_beds: 4 })
      .expect(200);

    const beds = await request(app)
      .get(`/ward/${wardId}/beds`)
      .set('Authorization', adminAuth)
      .expect(200);
    if (b(beds).length !== 4) throw new Error('Expected 4 beds after resize');

    await request(app)
      .delete(`/ward/${wardId}`)
      .set('Authorization', homAuth)
      .expect(403);
    await request(app)
      .delete(`/ward/${wardId}`)
      .set('Authorization', adminAuth)
      .expect(200);
  });

  it('Admin — not HOM — can create and delete an inventory catalog item; HOM keeps stock read/update access', async () => {
    const admin = await login('owner@hosp.com', 'Owner@123');
    const hom = await login('admin@hosp.com', 'Hom@123');
    const adminAuth = `Bearer ${admin.token}`;
    const homAuth = `Bearer ${hom.token}`;

    await request(app)
      .post('/inventory/items')
      .set('Authorization', homAuth)
      .send({ item_name: 'HOM Should Not Create This', category: 'Consumable', stock_quantity: 5, reorder_level: 1 })
      .expect(403);

    const created = await request(app)
      .post('/inventory/items')
      .set('Authorization', adminAuth)
      .send({ item_name: 'e2e Test Item', category: 'Consumable', stock_quantity: 5, reorder_level: 1 })
      .expect(201);

    await request(app)
      .get('/inventory/items')
      .set('Authorization', homAuth)
      .expect(200);
    await request(app)
      .put(`/inventory/items/${b(created).item_id}`)
      .set('Authorization', homAuth)
      .send({ stock_quantity: 4 })
      .expect(200);

    await request(app)
      .delete(`/inventory/items/${b(created).item_id}`)
      .set('Authorization', homAuth)
      .expect(403);
    await request(app)
      .delete(`/inventory/items/${b(created).item_id}`)
      .set('Authorization', adminAuth)
      .expect(200);
  });

  it('RBAC/custom-role administration moved to Admin — HOM can no longer reach it', async () => {
    const admin = await login('owner@hosp.com', 'Owner@123');
    const hom = await login('admin@hosp.com', 'Hom@123');

    await request(app)
      .get('/rbac/roles')
      .set('Authorization', `Bearer ${hom.token}`)
      .expect(403);
    await request(app)
      .get('/rbac/roles')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
  });

  it("Admin gets read access to ward/inventory/billing/patient/admission for hospital-wide analytics, but no operational write access", async () => {
    const admin = await login('owner@hosp.com', 'Owner@123');
    const adminAuth = `Bearer ${admin.token}`;

    await request(app).get('/ward').set('Authorization', adminAuth).expect(200);
    await request(app).get('/inventory/items').set('Authorization', adminAuth).expect(200);
    await request(app).get('/billing/services').set('Authorization', adminAuth).expect(200);
    await request(app).get('/patient').set('Authorization', adminAuth).expect(200);
    await request(app).get('/admission').set('Authorization', adminAuth).expect(200);

    // Operational writes stay HOM/PRE/FA's job, not Admin's.
    await request(app)
      .put('/ward/bed/1')
      .set('Authorization', adminAuth)
      .send({ status: 'MAINTENANCE' })
      .expect(403);
  });
});

describe('Session Isolation and HOM Leader Workflow (e2e)', () => {
  const app = createApp();

  it('maintains independent sessions for User A and User B; logging out User A does not affect User B', async () => {
    // 1. User A (HOM) logs in
    const userALogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@hosp.com', password: 'Hom@123' })
      .expect(200);
    const tokenA = b(userALogin).token;
    expect(tokenA).toBeTruthy();

    // 2. User B (FA) logs in
    const userBLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'farah.fa@hosp.com', password: 'Fa@123' })
      .expect(200);
    const tokenB = b(userBLogin).token;
    expect(tokenB).toBeTruthy();
    expect(tokenA).not.toEqual(tokenB);

    // Both sessions are active
    const meA = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(b(meA).role).toBe('HOM');

    const meB = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(b(meB).role).toBe('FA');

    // 3. User A logs out
    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    // 4. Verify only User A session is destroyed
    await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(401);

    // 5. Verify User B session is STILL ACTIVE
    const meBAfter = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(b(meBAfter).role).toBe('FA');

    // User B can still perform authenticated actions
    await request(app)
      .get('/billing/services')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
  });

  it('supports cookie-based session identification and cookie clearance on logout', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@hosp.com', password: 'Hom@123' })
      .expect(200);

    const cookieHeader = loginRes.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    expect(cookie).toContain('sessionId=');

    // Use Cookie header instead of Authorization header
    const token = b(loginRes).token;
    const meRes = await request(app)
      .get('/auth/me')
      .set('Cookie', `sessionId=${token}`)
      .expect(200);
    expect(b(meRes).role).toBe('HOM');

    // Logout using Cookie
    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Cookie', `sessionId=${token}`)
      .expect(200);
    expect(logoutRes.headers['set-cookie']).toBeDefined();

    // Session is now destroyed
    await request(app)
      .get('/auth/me')
      .set('Cookie', `sessionId=${token}`)
      .expect(401);
  });

  it('HOM adds a Leader -> FA sees it in Charges -> FA approves it into patient Ledger -> duplicate approval prevented', async () => {
    // Login HOM and FA
    const homLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@hosp.com', password: 'Hom@123' })
      .expect(200);
    const homAuth = `Bearer ${b(homLogin).token}`;

    const faLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'farah.fa@hosp.com', password: 'Fa@123' })
      .expect(200);
    const faAuth = `Bearer ${b(faLogin).token}`;

    // Get an existing admission
    const admissions = await request(app)
      .get('/admission')
      .set('Authorization', homAuth)
      .expect(200);
    const admissionId = b(admissions)[0].admission_id;

    // 1. HOM adds a Leader
    const createLeaderRes = await request(app)
      .post('/billing/leaders')
      .set('Authorization', homAuth)
      .send({
        admission_id: admissionId,
        service_id: 1,
        quantity: 2,
      })
      .expect(201);

    const leader = b(createLeaderRes);
    expect(leader.leader_id).toBeTruthy();
    expect(leader.status).toBe('PENDING');
    expect(leader.quantity).toBe(2);

    // 2. FA lists leaders
    const listRes = await request(app)
      .get('/billing/leaders')
      .set('Authorization', faAuth)
      .expect(200);
    const found = b(listRes).find((l) => l.leader_id === leader.leader_id);
    expect(found).toBeDefined();
    expect(found.status).toBe('PENDING');

    // 3. FA approves the Leader
    const approveRes = await request(app)
      .put(`/billing/leaders/${leader.leader_id}/approve`)
      .set('Authorization', faAuth)
      .expect(200);

    expect(b(approveRes).success).toBe(true);
    expect(b(approveRes).leader.status).toBe('APPROVED');
    expect(b(approveRes).ledgerEntry).toBeDefined();
    expect(b(approveRes).ledger).toBeDefined();

    // 4. Duplicate approval attempt is rejected
    await request(app)
      .put(`/billing/leaders/${leader.leader_id}/approve`)
      .set('Authorization', faAuth)
      .expect(400);

    // 5. Verify the entry exists in the Ledger
    const ledgerEntries = await request(app)
      .get(`/billing/ledger/${b(approveRes).ledger.ledger_id}/entries`)
      .set('Authorization', faAuth)
      .expect(200);
    const hasEntry = b(ledgerEntries).some(
      (e) => e.service_id === 1 && e.quantity === 2,
    );
    expect(hasEntry).toBe(true);
  });
});
