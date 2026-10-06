process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { initDb } from '../db/migrate';

const app = createApp();

interface CompanyItem {
  id: string;
  name: string;
  website: string;
  domain: string;
  industry: string;
  location: string;
  employeeSize: string;
  employeeCount: number;
  productFit: string;
  leadRelevanceScore: number;
  status: string;
  contacts?: Array<{ id: string; name: string }>;
  leads?: Array<{ id: string; title: string }>;
}

interface CompanyListResponse {
  items: CompanyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

describe('Phase 3 — Company Management & IT Mapping Test Suite', () => {
  let adminToken: string;
  let viewerToken: string;
  let createdCompanyId: string;

  before(async () => {
    await initDb();

    // Login admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leadgen.com', password: 'Admin@12345' });
    adminToken = (adminLoginRes.body as { data: { token: string } }).data.token;

    // Login viewer
    const viewerLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'viewer@leadgen.com', password: 'Sakshi@12345' });
    viewerToken = (viewerLoginRes.body as { data: { token: string } }).data.token;
  });

  describe('1. Authentication & Authorization Enforcement', () => {
    it('should reject company listing without authentication token (401)', async () => {
      const res = await request(app).get('/api/v1/companies');
      assert.equal(res.status, 401);
      assert.equal((res.body as { success: boolean }).success, false);
      assert.equal((res.body as { code: string }).code, 'AUTH_TOKEN_MISSING');
    });

    it('should reject company listing with invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', 'Bearer invalid_token_12345');
      assert.equal(res.status, 401);
      assert.equal((res.body as { success: boolean }).success, false);
      assert.equal((res.body as { code: string }).code, 'AUTH_SESSION_INVALID');
    });

    it('should reject company creation by unauthorized viewer role (403)', async () => {
      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Unauthorized Corp',
          website: 'https://unauthorized.com',
          industry: 'Software',
          location: 'Austin, TX',
          employeeSize: '11-50',
        });
      assert.equal(res.status, 403);
      assert.equal((res.body as { success: boolean }).success, false);
      assert.equal((res.body as { code: string }).code, 'FORBIDDEN_PERMISSION');
    });
  });

  describe('2. Company Creation & Duplicate Prevention', () => {
    it('should create a valid company with all IT mapping fields (201)', async () => {
      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nexus Cloud Systems',
          website: 'https://nexuscloud.io',
          industry: 'Enterprise Software',
          location: 'Seattle, WA',
          employeeSize: '100-250',
          employeeCount: 180,
          hiringSignals: 'Hiring 5+ Site Reliability Engineers and Platform Architects',
          currentTools: 'Kubernetes, Terraform, Datadog, Slack',
          productFit: 'High',
          leadRelevanceScore: 92,
          notes: 'Evaluating cloud migration orchestration platforms in Q4.',
          status: 'Prospect',
        });

      assert.equal(res.status, 201);
      const body = res.body as { success: boolean; data: CompanyItem };
      assert.equal(body.success, true);
      assert.ok(body.data.id.startsWith('cmp_'));
      assert.equal(body.data.name, 'Nexus Cloud Systems');
      assert.equal(body.data.domain, 'nexuscloud.io');
      assert.equal(body.data.industry, 'Enterprise Software');
      assert.equal(body.data.productFit, 'High');
      assert.equal(body.data.leadRelevanceScore, 92);
      assert.equal(body.data.status, 'Prospect');

      createdCompanyId = body.data.id;
    });

    it('should reject creation with missing required fields (400)', async () => {
      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
          website: 'invalid-url',
        });

      assert.equal(res.status, 400);
      const body = res.body as { success: boolean; code: string };
      assert.equal(body.success, false);
      assert.equal(body.code, 'MISSING_COMPANY_NAME');
    });

    it('should prevent duplicate company by normalized name (409)', async () => {
      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'nexus cloud systems', // same name, different casing
          website: 'https://different-domain.com',
          industry: 'Other',
          location: 'Anywhere',
          employeeSize: '1-10',
        });

      assert.equal(res.status, 409);
      const body = res.body as { success: boolean; code: string };
      assert.equal(body.success, false);
      assert.equal(body.code, 'DUPLICATE_COMPANY_NAME');
    });

    it('should prevent duplicate company by domain/website (409)', async () => {
      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Completely Unique Brand',
          website: 'http://www.nexuscloud.io/about', // same domain as nexuscloud.io
          industry: 'Other',
          location: 'Anywhere',
          employeeSize: '1-10',
        });

      assert.equal(res.status, 409);
      const body = res.body as { success: boolean; code: string };
      assert.equal(body.success, false);
      assert.equal(body.code, 'DUPLICATE_COMPANY_DOMAIN');
    });
  });

  describe('3. Company Listing, Search, Filter & Pagination', () => {
    it('should list companies with pagination metadata (200)', async () => {
      const res = await request(app)
        .get('/api/v1/companies?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const body = res.body as { success: boolean; data: CompanyListResponse };
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.items));
      assert.ok(body.data.items.length > 0);
      assert.ok(body.data.total >= 1);
      assert.equal(body.data.page, 1);
      assert.equal(body.data.limit, 5);
      assert.ok(body.data.totalPages >= 1);
    });

    it('should search companies across name, tools, industry, notes (200)', async () => {
      const res = await request(app)
        .get('/api/v1/companies?search=Kubernetes')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const body = res.body as { success: boolean; data: CompanyListResponse };
      assert.equal(body.success, true);
      const found = body.data.items.some((c) => c.name === 'Nexus Cloud Systems');
      assert.ok(found, 'Should find Nexus Cloud Systems by its currentTools matching Kubernetes');
    });

    it('should filter companies by industry and product fit (200)', async () => {
      const res = await request(app)
        .get('/api/v1/companies?industry=Cloud+%26+Cybersecurity&productFit=High')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const body = res.body as { success: boolean; data: CompanyListResponse };
      assert.equal(body.success, true);
      for (const item of body.data.items) {
        assert.equal(item.industry, 'Cloud & Cybersecurity');
        assert.equal(item.productFit, 'High');
      }
    });

    it('should sort companies by leadRelevanceScore descending (200)', async () => {
      const res = await request(app)
        .get('/api/v1/companies?sortBy=leadRelevanceScore&sortOrder=desc')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const body = res.body as { success: boolean; data: CompanyListResponse };
      assert.equal(body.success, true);
      for (let i = 0; i < body.data.items.length - 1; i++) {
        assert.ok(body.data.items[i].leadRelevanceScore >= body.data.items[i + 1].leadRelevanceScore);
      }
    });
  });

  describe('4. Company Details with Related Contacts & Leads', () => {
    it('should return company details with associated contacts and leads (200)', async () => {
      const res = await request(app)
        .get('/api/v1/companies/cmp_techcorp_01')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const body = res.body as { success: boolean; data: CompanyItem };
      assert.equal(body.success, true);
      assert.equal(body.data.id, 'cmp_techcorp_01');
      assert.equal(body.data.name, 'TechCorp Solutions');
      assert.ok(Array.isArray(body.data.contacts), 'Should include related contacts');
      assert.ok(body.data.contacts.length >= 1, 'Should have at least 1 contact');
      assert.ok(Array.isArray(body.data.leads), 'Should include related leads');
      assert.ok(body.data.leads.length >= 1, 'Should have at least 1 lead');
    });

    it('should return 404 for non-existent company', async () => {
      const res = await request(app)
        .get('/api/v1/companies/cmp_nonexistent_999')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 404);
      const body = res.body as { success: boolean; code: string };
      assert.equal(body.success, false);
      assert.equal(body.code, 'COMPANY_NOT_FOUND');
    });
  });

  describe('5. Company Update & Duplicate Validation', () => {
    it('should update company attributes successfully (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          location: 'San Jose, CA',
          productFit: 'High',
          status: 'Contacted',
          notes: 'Reached out to VP Engineering on LinkedIn.',
        });

      assert.equal(res.status, 200);
      const body = res.body as { success: boolean; data: CompanyItem };
      assert.equal(body.success, true);
      assert.equal(body.data.location, 'San Jose, CA');
      assert.equal(body.data.status, 'Contacted');
    });

    it('should reject update if renaming creates a duplicate name (409)', async () => {
      const res = await request(app)
        .patch(`/api/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'TechCorp Solutions', // already taken by cmp_techcorp_01
        });

      assert.equal(res.status, 409);
      const body = res.body as { success: boolean; code: string };
      assert.equal(body.success, false);
      assert.equal(body.code, 'DUPLICATE_COMPANY_NAME');
    });
  });

  describe('6. Company Archive & Deletion', () => {
    it('should archive company and exclude from active listings (200)', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(deleteRes.status, 200);
      assert.equal((deleteRes.body as { success: boolean }).success, true);

      // Verify that company is no longer in default listing
      const listRes = await request(app)
        .get('/api/v1/companies?search=Nexus+Cloud')
        .set('Authorization', `Bearer ${adminToken}`);

      const body = listRes.body as { success: boolean; data: CompanyListResponse };
      const found = body.data.items.some((c) => c.id === createdCompanyId);
      assert.equal(found, false, 'Archived company should not be listed by default');

      // Verify company is still accessible by ID with status Archived
      const getRes = await request(app)
        .get(`/api/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(getRes.status, 200);
      assert.equal((getRes.body as { data: CompanyItem }).data.status, 'Archived');
    });

    it('should allow permanent deletion when requested (200)', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/companies/${createdCompanyId}?permanent=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(deleteRes.status, 200);

      // Verify company is completely removed
      const getRes = await request(app)
        .get(`/api/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(getRes.status, 404);
    });
  });
});
