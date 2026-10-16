'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const emailIdentity = require('../utils/emailIdentity');
const authService = require('../services/auth.service');
const rbacService = require('../services/rbac.service');
const organizationService = require('../services/organization.service');
const provisioningService = require('../services/provisioning.service');
const dataStore = require('../store/dataStore');
const { getSession } = require('../store/sessionStore');

/**
 * Unified login: one page for every actor. The email's tag picks the portal
 * (name.hom@ → HOM) and, for staff, its domain picks the hospital.
 */
describe('Unified login (email tag → portal, domain → hospital)', () => {
  const app = createApp();

  describe('emailIdentity.parseEmail', () => {
    const { parseEmail } = emailIdentity;

    it('reads the actor from the tag before the @', () => {
      expect(parseEmail('rekha.pre@citygen.com')).toMatchObject({
        actor: 'PRE',
        domain: 'citygen.com',
      });
      expect(parseEmail('admin.hom@apollo.com').actor).toBe('HOM');
      expect(parseEmail('farah.fa@citygen.com').actor).toBe('FA');
      expect(parseEmail('owner.admin@citygen.com').actor).toBe('Admin');
      expect(parseEmail('super.platform@federico.com').actor).toBe('PLATFORM');
    });

    it('treats an untagged address as a patient', () => {
      expect(parseEmail('arjun.k@hosp.com')).toMatchObject({
        actor: 'Patient',
        tag: null,
      });
      expect(parseEmail('meera@gmail.com').actor).toBe('Patient');
    });

    it('is case-insensitive, handles multi-dot names, and ignores tag-like domains', () => {
      expect(parseEmail('Rekha.PRE@CityGen.com')).toMatchObject({
        actor: 'PRE',
        domain: 'citygen.com',
      });
      expect(parseEmail('billing.assist.pre@citygen.com')).toMatchObject({
        name: 'billing.assist',
        actor: 'PRE',
      });
      expect(parseEmail('x@pre.com').actor).toBe('Patient');
    });

    it('returns null for malformed input', () => {
      expect(parseEmail('')).toBeNull();
      expect(parseEmail('not-an-email')).toBeNull();
      expect(parseEmail('a@b')).toBeNull();
      expect(parseEmail(null)).toBeNull();
    });

    it('suggests a short domain from the hospital name', () => {
      const { suggestEmailDomainBase } = emailIdentity;
      expect(suggestEmailDomainBase('City General Hospital')).toBe(
        'citygen.com',
      );
      expect(suggestEmailDomainBase('Apollo Hospitals')).toBe('apollo.com');
      expect(suggestEmailDomainBase('Sri Ramachandra Medical Centre')).toBe(
        'sriram.com',
      );
      expect(suggestEmailDomainBase('Integrity Hospital')).toBe(
        'integrity.com',
      );
    });
  });

  describe('POST /auth/login/:actor', () => {
    it('signs a staff member in through their own portal', async () => {
      const res = await request(app)
        .post('/auth/login/pre')
        .send({
          email: 'rekha.pre@citygen.com',
          password: 'Pre@123',
          organization_id: 1,
        })
        .expect(200);
      expect(res.body.role).toBe('PRE');
      expect(res.body.tenant.email_domain).toBe('citygen.com');
    });

    it('signs a patient in through the patient portal', async () => {
      const res = await request(app)
        .post('/auth/login/patient')
        .send({
          email: 'arjun.k@hosp.com',
          password: 'Hamiz@123',
          organization_id: 1,
        })
        .expect(200);
      expect(res.body.role).toBe('Patient');
    });

    it('signs a single-hospital patient in directly without organization_id', async () => {
      const res = await request(app)
        .post('/auth/login/patient')
        .send({
          email: 'arjun.k@hosp.com',
          password: 'Hamiz@123',
        })
        .expect(200);
      expect(res.body.role).toBe('Patient');
      expect(res.body.tenant.organization_id).toBe(1);
    });

    it('returns dynamic demo credentials from GET /auth/demo-accounts', async () => {
      const res = await request(app)
        .get('/auth/demo-accounts')
        .expect(200);
      expect(res.body.organizations).toBeDefined();
      expect(res.body.organizations['1']).toBeDefined();
      expect(res.body.organizations['2']).toBeDefined();
      expect(res.body.platform).toBeDefined();
      expect(res.body.platform.role).toBe('Platform');
    });

    it('requires organization selection when patient is registered at multiple hospitals with matching credentials', async () => {
      const multiEmail = 'shared.patient@personal.com';
      const multiPass = 'Shared@123';
      authService.signup({
        name: 'Shared User 1',
        email: multiEmail,
        password: multiPass,
        phone: '+919999900001',
        dob: '1995-05-05',
        gender: 'Male',
        organization_id: 1,
      });
      authService.signup({
        name: 'Shared User 2',
        email: multiEmail,
        password: multiPass,
        phone: '+919999900002',
        dob: '1995-05-05',
        gender: 'Male',
        organization_id: 2,
      });

      const checkRes = await request(app)
        .post('/auth/login/patient')
        .send({ email: multiEmail, password: multiPass })
        .expect(200);
      expect(checkRes.body.requiresOrganizationSelection).toBe(true);
      expect(checkRes.body.organizations.length).toBe(2);

      const directRes = await request(app)
        .post('/auth/login/patient')
        .send({ email: multiEmail, password: multiPass, organization_id: 2 })
        .expect(200);
      expect(directRes.body.role).toBe('Patient');
      expect(directRes.body.tenant.organization_id).toBe(2);
    });

    it('rejects an account of another role with 403 WRONG_PORTAL', async () => {
      const res = await request(app)
        .post('/auth/login/hom')
        .send({ email: 'arjun.k@hosp.com', password: 'Hamiz@123' })
        .expect(403);
      expect(res.body.message).toBe(
        'This account does not belong to that portal',
      );
    });

    it('checks the password before revealing a role mismatch', async () => {
      await request(app)
        .post('/auth/login/hom')
        .send({ email: 'arjun.k@hosp.com', password: 'wrong' })
        .expect(401);
    });

    it('404s an unknown portal', async () => {
      await request(app)
        .post('/auth/login/janitor')
        .send({ email: 'rekha.pre@citygen.com', password: 'Pre@123' })
        .expect(404);
    });

    it('exposes each hospital email domain on the public org list', async () => {
      const res = await request(app)
        .get('/marketplace/organizations')
        .expect(200);
      const domains = res.body.map((o) => o.email_domain);
      expect(domains).toEqual(
        expect.arrayContaining(['citygen.com', 'apollo.com']),
      );
    });
  });

  describe('account-creation guards', () => {
    const base = {
      name: 'New Patient',
      password: 'Patient@123',
      phone: '+919876500111',
      dob: '1990-01-01',
      gender: 'Female',
      organization_id: 1,
    };

    it('patients cannot register a staff-shaped address on a hospital domain', () => {
      expect(
        authService.signup({ ...base, email: 'sneaky.hom@citygen.com' }),
      ).toEqual({
        error: 'EMAIL_RESERVED',
      });
      expect(
        authService.signup({ ...base, email: 'sneaky.platform@federico.com' }),
      ).toEqual({
        error: 'EMAIL_RESERVED',
      });
    });

    it('patients may use a personal address that merely looks tagged', () => {
      const result = authService.signup({
        ...base,
        email: 'mohammed.fa@gmail.com',
      });
      expect(result.error).toBeUndefined();
      expect(result.role).toBe('Patient');
    });

    it('staff emails must carry their role tag and the hospital domain', () => {
      const payload = {
        name: 'Nina',
        password: 'Nina@1234',
        actor_role: 'HOM',
      };
      expect(
        rbacService.createStaffUser(1, {
          ...payload,
          email: 'nina.pre@citygen.com',
        }).error,
      ).toBe('EMAIL_ROLE_MISMATCH');
      expect(
        rbacService.createStaffUser(1, {
          ...payload,
          email: 'nina.hom@apollo.com',
        }).error,
      ).toBe('EMAIL_DOMAIN_MISMATCH');
      const created = rbacService.createStaffUser(1, {
        ...payload,
        email: 'nina.hom@citygen.com',
      });
      expect(created).toMatchObject({
        email: 'nina.hom@citygen.com',
        actor_role: 'HOM',
      });
    });

    it('changing a staff role renames the email tag to match', () => {
      const created = rbacService.createStaffUser(1, {
        name: 'Omar',
        email: 'omar.pre@citygen.com',
        password: 'Omar@1234',
        actor_role: 'PRE',
      });
      const updated = rbacService.setStaffRole(created.user_id, 'FA');
      expect(updated.email).toBe('omar.fa@citygen.com');
      expect(
        authService.login('omar.fa@citygen.com', 'Omar@1234', 1, 'FA').role,
      ).toBe('FA');
    });

    it('provisioning requires a name.admin@<email_domain> admin and a free, non-public domain', () => {
      const payload = {
        name: 'Lakeside Hospital',
        plan_id: 1,
        admin_name: 'Lake Owner',
        admin_password: 'Lake@1234',
      };
      expect(
        provisioningService.provision({
          ...payload,
          email_domain: 'lakeside.com',
          admin_email: 'owner@lakeside.com',
        }).error,
      ).toBe('ADMIN_EMAIL_MISMATCH');
      expect(
        provisioningService.provision({
          ...payload,
          email_domain: 'gmail.com',
          admin_email: 'owner.admin@gmail.com',
        }).error,
      ).toBe('INVALID_EMAIL_DOMAIN');
      expect(
        provisioningService.provision({
          ...payload,
          email_domain: 'citygen.com',
          admin_email: 'owner.admin@citygen.com',
        }).error,
      ).toBe('EMAIL_DOMAIN_TAKEN');

      const ok = provisioningService.provision({
        ...payload,
        admin_email: 'lake.admin@lakeside.com',
      });
      expect(ok.error).toBeUndefined();
      expect(ok.organization.email_domain).toBe('lakeside.com'); // suggested from the name
    });
  });

  describe('organizationService.changeEmailDomain', () => {
    it('renames staff logins, signs them out, and leaves patients alone', () => {
      const { organization } = provisioningService.provision({
        name: 'Riverbend Clinic',
        plan_id: 1,
        email_domain: 'riverbend.com',
        admin_name: 'River Owner',
        admin_email: 'river.admin@riverbend.com',
        admin_password: 'River@1234',
      });
      const oid = organization.organization_id;
      rbacService.createStaffUser(oid, {
        name: 'Hank',
        email: 'hank.hom@riverbend.com',
        password: 'Hank@1234',
        actor_role: 'HOM',
      });
      const patient = authService.signup({
        name: 'Pat',
        email: 'pat@riverbend.com',
        password: 'Pat@12345',
        phone: '+919876500222',
        dob: '1991-02-02',
        gender: 'Male',
        organization_id: oid,
      });
      const hankSession = authService.login(
        'hank.hom@riverbend.com',
        'Hank@1234',
        oid,
        'HOM',
      );
      expect(organizationService.staffLoginCount(oid)).toBe(2);

      const result = organizationService.changeEmailDomain(oid, 'rbc.com');
      expect(result.error).toBeUndefined();
      expect(result.renamedUsers.map((u) => u.email).sort()).toEqual([
        'hank.hom@rbc.com',
        'river.admin@rbc.com',
      ]);
      expect(getSession(hankSession.token)).toBeNull();
      expect(
        authService.login('hank.hom@rbc.com', 'Hank@1234', oid, 'HOM').role,
      ).toBe('HOM');
      expect(
        authService.login('hank.hom@riverbend.com', 'Hank@1234').error,
      ).toBe('INVALID_CREDENTIALS');
      expect(
        dataStore.users.find((u) => u.user_id === patient.user.user_id).email,
      ).toBe('pat@riverbend.com');

      expect(
        organizationService.changeEmailDomain(oid, 'apollo.com').error,
      ).toBe('EMAIL_DOMAIN_TAKEN');
      expect(
        organizationService.changeEmailDomain(oid, 'yahoo.com').error,
      ).toBe('INVALID_EMAIL_DOMAIN');
    });

    it('is exposed to Platform Super Users at PATCH /platform/organizations/:id/email-domain', async () => {
      const platform = await request(app)
        .post('/platform/auth/login')
        .send({
          email: 'super.platform@federico.com',
          password: 'Federico@Platform123',
        })
        .expect(200);
      const auth = `Bearer ${platform.body.token}`;
      const { organization } = provisioningService.provision({
        name: 'Hilltop Hospital',
        plan_id: 1,
        email_domain: 'hilltop.com',
        admin_name: 'Hill Owner',
        admin_email: 'hill.admin@hilltop.com',
        admin_password: 'Hill@1234',
      });

      const impact = await request(app)
        .get(
          `/platform/organizations/${organization.organization_id}/email-domain`,
        )
        .set('Authorization', auth)
        .expect(200);
      expect(impact.body).toEqual({
        email_domain: 'hilltop.com',
        staff_logins: 1,
      });

      const res = await request(app)
        .patch(
          `/platform/organizations/${organization.organization_id}/email-domain`,
        )
        .set('Authorization', auth)
        .send({ email_domain: 'hilltop.org' })
        .expect(200);
      expect(res.body.organization.email_domain).toBe('hilltop.org');

      await request(app)
        .patch(
          `/platform/organizations/${organization.organization_id}/email-domain`,
        )
        .send({ email_domain: 'hilltop.net' })
        .expect((r) => expect([401, 403]).toContain(r.status));
    });
  });
});
