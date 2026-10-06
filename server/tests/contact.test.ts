process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { initDb } from '../db/migrate';
import { getDb } from '../db/database';

const app = createApp();

interface ContactItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string;
  department: string | null;
  companyId: string;
  companyName: string;
  decisionMaker: boolean;
  notes: string | null;
  status: string;
  leads?: Array<{ id: string; title: string; value: number }>;
}

interface ContactListResponse {
  items: ContactItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

describe('Phase 4 — Contacts & Decision Makers Test Suite', () => {
  let adminToken: string;
  let viewerToken: string;
  let createdContactId: string;
  const targetCompanyId = 'cmp_techcorp_01';

  before(async () => {
    await initDb();

    // Login admin (full permissions)
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leadgen.com', password: 'Admin@12345' });
    adminToken = (adminLoginRes.body as { data: { token: string } }).data.token;

    // Login viewer (read-only)
    const viewerLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'viewer@leadgen.com', password: 'Sakshi@12345' });
    viewerToken = (viewerLoginRes.body as { data: { token: string } }).data.token;
  });

  describe('1. Authentication & Authorization Enforcement', () => {
    it('should reject contact listing without authentication token (401)', async () => {
      const res = await request(app).get('/api/v1/contacts');
      assert.equal(res.status, 401);
      assert.equal((res.body as { success: boolean }).success, false);
    });

    it('should reject contact creation by unauthorized viewer role (403)', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Unauthorized User',
          title: 'Talent Acquisition Manager',
          companyId: targetCompanyId,
          email: 'unauthorized@example.com',
        });
      assert.equal(res.status, 403);
    });

    it('should allow read-only viewer to list contacts (200)', async () => {
      const res = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${viewerToken}`);
      assert.equal(res.status, 200);
      assert.equal((res.body as { success: boolean }).success, true);
    });
  });

  describe('2. Contact Creation & Validation', () => {
    it('should create a valid contact with company relationship and decision maker flag (201)', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Samantha Wright',
          title: 'Head of Recruitment',
          companyId: targetCompanyId,
          email: 'swright@techcorp.io',
          phone: '+1 (415) 555-0999',
          department: 'Talent Acquisition',
          decisionMaker: true,
          linkedinUrl: 'https://linkedin.com/in/samanthawright-recruiter',
          notes: 'Target contact for automated sourcing software; active on LinkedIn.',
          status: 'Active',
        });

      assert.equal(res.status, 201);
      const data = (res.body as { data: ContactItem }).data;
      assert.ok(data.id);
      assert.equal(data.name, 'Samantha Wright');
      assert.equal(data.title, 'Head of Recruitment');
      assert.equal(data.companyId, targetCompanyId);
      assert.equal(data.decisionMaker, true);
      assert.equal(data.notes, 'Target contact for automated sourcing software; active on LinkedIn.');
      createdContactId = data.id;
    });

    it('should reject contact creation with missing required fields (400)', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'noname@techcorp.io',
        });

      assert.equal(res.status, 400);
      assert.equal((res.body as { success: boolean }).success, false);
    });

    it('should reject contact creation with invalid email format (400)', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Email Person',
          title: 'HR Head',
          companyId: targetCompanyId,
          email: 'not-an-email-at-all',
        });

      assert.equal(res.status, 400);
      assert.equal((res.body as { code: string }).code, 'INVALID_EMAIL_FORMAT');
    });

    it('should reject contact creation with non-existent company reference (404)', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Ghost Company Contact',
          title: 'CEO',
          companyId: 'cmp_non_existent_9999',
          email: 'ghost@nonexistent.com',
        });

      assert.equal(res.status, 404);
      assert.equal((res.body as { code: string }).code, 'COMPANY_NOT_FOUND');
    });

    it('should prevent duplicate contact email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Samantha',
          title: 'Senior Recruiter',
          companyId: targetCompanyId,
          email: 'swright@techcorp.io', // Same email as earlier
        });

      assert.equal(res.status, 409);
      assert.equal((res.body as { code: string }).code, 'DUPLICATE_CONTACT_EMAIL');
      assert.ok((res.body as { duplicateContact: unknown }).duplicateContact);
    });
  });

  describe('3. Duplicate Check Endpoint (/api/v1/contacts/check-duplicate)', () => {
    it('should identify an existing contact email for real-time UI warning', async () => {
      const res = await request(app)
        .get('/api/v1/contacts/check-duplicate?email=swright@techcorp.io')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: { isDuplicate: boolean; existingContact?: { name: string } } }).data;
      assert.equal(data.isDuplicate, true);
      assert.equal(data.existingContact?.name, 'Samantha Wright');
    });

    it('should report false for a fresh email address', async () => {
      const res = await request(app)
        .get('/api/v1/contacts/check-duplicate?email=brand_new_contact_xyz@techcorp.io')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: { isDuplicate: boolean } }).data;
      assert.equal(data.isDuplicate, false);
    });
  });

  describe('4. Contact Listing, Search, Filter & Pagination', () => {
    it('should list contacts with pagination metadata (200)', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: ContactListResponse }).data;
      assert.ok(Array.isArray(data.items));
      assert.equal(data.limit, 5);
      assert.ok(data.total >= 6);
      assert.ok(data.totalPages >= 1);
    });

    it('should filter contacts by target role (Recruitment / Talent)', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?role=Recruitment')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: ContactListResponse }).data;
      assert.ok(data.items.length > 0);
      for (const item of data.items) {
        assert.ok(
          item.title.toLowerCase().includes('recruitment') ||
            item.title.toLowerCase().includes('talent') ||
            (item.department && item.department.toLowerCase().includes('recruitment'))
        );
      }
    });

    it('should filter contacts by company ID', async () => {
      const res = await request(app)
        .get(`/api/v1/contacts?companyId=${targetCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: ContactListResponse }).data;
      assert.ok(data.items.length >= 2);
      for (const item of data.items) {
        assert.equal(item.companyId, targetCompanyId);
      }
    });

    it('should filter contacts by decision_maker flag (true)', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?decisionMaker=true')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: ContactListResponse }).data;
      assert.ok(data.items.length > 0);
      for (const item of data.items) {
        assert.equal(item.decisionMaker, true);
      }
    });

    it('should search contacts across name, title, and company', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?search=Samantha')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: ContactListResponse }).data;
      assert.ok(data.items.length >= 1);
      assert.equal(data.items[0].name, 'Samantha Wright');
    });
  });

  describe('5. Contact Details & Relationships (Company → Contacts → Lead)', () => {
    it('should return contact details with associated company and lead records (200)', async () => {
      // cnt_001 (Alex Rivera) has associated leads in seed data
      const res = await request(app)
        .get('/api/v1/contacts/cnt_001')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: ContactItem }).data;
      assert.equal(data.id, 'cnt_001');
      assert.equal(data.name, 'Alex Rivera');
      assert.equal(data.companyName, 'TechCorp Solutions');
      assert.ok(Array.isArray(data.leads));
      assert.ok(data.leads.length >= 1);
      const seedLead = data.leads.find((l) => l.title === 'Enterprise Multi-Cloud Infrastructure Security');
      assert.ok(seedLead, 'Expected contact to have Enterprise Multi-Cloud Infrastructure Security lead');
    });

    it('should return 404 for non-existent contact ID', async () => {
      const res = await request(app)
        .get('/api/v1/contacts/cnt_does_not_exist')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 404);
      assert.equal((res.body as { code: string }).code, 'CONTACT_NOT_FOUND');
    });
  });

  describe('6. Contact Update & Decision Maker Toggle', () => {
    it('should update contact details successfully (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'VP of Talent Acquisition & People Ops',
          notes: 'Promoted to VP; expanded purchasing budget.',
        });

      assert.equal(res.status, 200);
      const data = (res.body as { data: ContactItem }).data;
      assert.equal(data.title, 'VP of Talent Acquisition & People Ops');
      assert.equal(data.notes, 'Promoted to VP; expanded purchasing budget.');
    });

    it('should toggle decision maker status quickly (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/contacts/${createdContactId}/decision-maker`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decisionMaker: false });

      assert.equal(res.status, 200);
      const data = (res.body as { data: ContactItem }).data;
      assert.equal(data.decisionMaker, false);
    });

    it('should reject update if attempting to change email to an existing one (409)', async () => {
      const res = await request(app)
        .patch(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'a.rivera@techcorp.io', // Belongs to Alex Rivera
        });

      assert.equal(res.status, 409);
      assert.equal((res.body as { code: string }).code, 'DUPLICATE_CONTACT_EMAIL');
    });
  });

  describe('7. Contact Archive & Deletion', () => {
    it('should archive contact and exclude from active listings (200)', async () => {
      const res = await request(app)
        .delete(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);

      // Verify contact is excluded from active list
      const listRes = await request(app)
        .get(`/api/v1/contacts?search=Samantha`)
        .set('Authorization', `Bearer ${adminToken}`);
      const listData = (listRes.body as { data: ContactListResponse }).data;
      assert.equal(listData.items.length, 0);

      // Verify contact is included when includeArchived=true
      const archivedRes = await request(app)
        .get(`/api/v1/contacts?search=Samantha&includeArchived=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      const archivedData = (archivedRes.body as { data: ContactListResponse }).data;
      assert.equal(archivedData.items.length, 1);
      assert.equal(archivedData.items[0].status, 'Archived');
    });

    it('should allow permanent deletion when requested (200)', async () => {
      const res = await request(app)
        .delete(`/api/v1/contacts/${createdContactId}?permanent=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);

      const checkRes = await request(app)
        .get(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(checkRes.status, 404);
    });
  });

  describe('8. Database Foreign Key Cascade Integrity', () => {
    it('should automatically cascade delete contacts when a company is deleted', async () => {
      const db = getDb();

      // Create a temporary company
      const tempCompanyId = 'cmp_temp_cascade_test';
      db.prepare(`
        INSERT INTO companies (id, name, normalized_name, website, normalized_domain, industry, location, employee_size)
        VALUES (?, 'Cascade Test Co', 'cascadetestco', 'https://cascade.test', 'cascade.test', 'Testing', 'Test City', '1-10')
      `).run(tempCompanyId);

      // Create a contact linked to this company
      const tempContactId = 'cnt_temp_cascade_contact';
      db.prepare(`
        INSERT INTO contacts (id, company_id, name, title, email)
        VALUES (?, ?, 'Cascade Contact', 'Director', 'cascade@test.com')
      `).run(tempContactId, tempCompanyId);

      // Verify contact exists
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE id = ?').get(tempContactId) as unknown as { count: number };
      assert.equal(beforeCount.count, 1);

      // Delete the parent company
      db.prepare('DELETE FROM companies WHERE id = ?').run(tempCompanyId);

      // Verify contact was cascaded and deleted, preventing orphan broken references
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE id = ?').get(tempContactId) as unknown as { count: number };
      assert.equal(afterCount.count, 0);
    });
  });
});
