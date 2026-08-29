'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const { createSession } = require('../store/sessionStore');

/**
 * The org Admin (hospital owner) can now manage the doctor directory and edit
 * inventory catalog items, alongside its existing ward/department control.
 * Gated by `doctorDirectory` / `inventoryCatalog` in middleware/actorAccess.js.
 */
describe('Org Admin: doctor directory & inventory catalog access', () => {
  let app;
  let adminOrg1;
  let adminOtherOrg;
  let homOrg1;

  beforeAll(() => {
    app = createApp();
    adminOrg1 = createSession({ userId: 105, role: 'Admin', organizationId: 1, hospitalId: 1 });
    adminOtherOrg = createSession({ userId: 105, role: 'Admin', organizationId: 777, hospitalId: 1 });
    homOrg1 = createSession({ userId: 102, role: 'HOM', organizationId: 1, hospitalId: 1 });
  });

  describe('doctors', () => {
    let doctorId;

    it('lets the Admin add a doctor scoped to its org, with a department', async () => {
      const res = await request(app)
        .post('/doctor')
        .set('Authorization', `Bearer ${adminOrg1}`)
        .send({ name: 'Dr. Test Ortho', specialization: 'Orthopedics', department: 'Surgery' });
      expect(res.status).toBe(201);
      expect(res.body.department).toBe('Surgery');
      expect(res.body.organization_id).toBe(1);
      doctorId = res.body.doctor_id;
    });

    it('lets the Admin edit that doctor', async () => {
      const res = await request(app)
        .put(`/doctor/${doctorId}`)
        .set('Authorization', `Bearer ${adminOrg1}`)
        .send({ department: 'Pediatrics' });
      expect(res.status).toBe(200);
      expect(res.body.department).toBe('Pediatrics');

      const list = await request(app)
        .get('/doctor')
        .set('Authorization', `Bearer ${adminOrg1}`);
      const found = list.body.find((d) => d.doctor_id === doctorId);
      expect(found).toBeDefined();
      expect(found.department).toBe('Pediatrics');
    });

    it('blocks an Admin of another org from editing or removing it', async () => {
      const put = await request(app)
        .put(`/doctor/${doctorId}`)
        .set('Authorization', `Bearer ${adminOtherOrg}`)
        .send({ department: 'Emergency' });
      expect(put.status).toBe(403);

      const del = await request(app)
        .delete(`/doctor/${doctorId}`)
        .set('Authorization', `Bearer ${adminOtherOrg}`);
      expect(del.status).toBe(403);
    });

    it('lets the Admin remove the doctor', async () => {
      const res = await request(app)
        .delete(`/doctor/${doctorId}`)
        .set('Authorization', `Bearer ${adminOrg1}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);

      const list = await request(app)
        .get('/doctor')
        .set('Authorization', `Bearer ${adminOrg1}`);
      expect(list.body.find((d) => d.doctor_id === doctorId)).toBeUndefined();
    });

    it('still lets HOM add a doctor (no regression)', async () => {
      const res = await request(app)
        .post('/doctor')
        .set('Authorization', `Bearer ${homOrg1}`)
        .send({ name: 'Dr. HOM Added', specialization: 'General Practitioner' });
      expect(res.status).toBe(201);
    });
  });

  describe('inventory catalog', () => {
    it('lets the Admin edit an existing catalog item', async () => {
      const items = await request(app)
        .get('/inventory/items')
        .set('Authorization', `Bearer ${adminOrg1}`);
      const item = items.body[0];
      expect(item).toBeDefined();

      const res = await request(app)
        .put(`/inventory/items/${item.item_id}`)
        .set('Authorization', `Bearer ${adminOrg1}`)
        .send({ reorder_level: (item.reorder_level || 0) + 5 });
      expect(res.status).toBe(200);
      expect(res.body.reorder_level).toBe((item.reorder_level || 0) + 5);
    });

    it('still lets HOM edit a catalog item (no regression)', async () => {
      const items = await request(app)
        .get('/inventory/items')
        .set('Authorization', `Bearer ${homOrg1}`);
      const item = items.body[0];
      const res = await request(app)
        .put(`/inventory/items/${item.item_id}`)
        .set('Authorization', `Bearer ${homOrg1}`)
        .send({ reorder_level: (item.reorder_level || 0) + 1 });
      expect(res.status).toBe(200);
    });
  });
});
