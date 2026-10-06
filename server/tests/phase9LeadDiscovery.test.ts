process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { initDb } from '../db/migrate';
import { getDb } from '../db/database';

const app = createApp();

describe('Phase 9 — Advanced Lead Discovery & Search APIs Test Suite', () => {
  let adminToken: string;
  let viewerToken: string;

  before(async () => {
    await initDb();

    // Authenticate admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leadgen.com', password: 'Admin@12345' });
    adminToken = (adminLoginRes.body as { data: { token: string } }).data.token;

    // Authenticate viewer
    const viewerLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'viewer@leadgen.com', password: 'Sakshi@12345' });
    viewerToken = (viewerLoginRes.body as { data: { token: string } }).data.token;

    // Ensure rich test data exists for discovery verification
    const db = getDb();

    // Seed dedicated Phase 9 discovery companies and leads
    const testCompanyId1 = 'cmp_phase9_disc_01';
    db.prepare(`
      INSERT OR REPLACE INTO companies (
        id, name, normalized_name, website, normalized_domain, industry, location,
        employee_size, employee_count, hiring_signals, current_tools, product_fit,
        lead_relevance_score, status, notes
      ) VALUES (
        ?, 'Apex Staffing Solutions', 'apexstaffingsolutions', 'https://apexstaffing.com', 'apexstaffing.com',
        'Staffing & Recruiting', 'Austin, TX', '201-500', 320,
        'Bulk hiring 25+ engineers & technical recruiters with high-volume shortlisting',
        'Workable, Excel', 'High', 95, 'Qualified', 'Recruitment agency actively evaluating ATS platforms'
      )
    `).run(testCompanyId1);

    const testCompanyId2 = 'cmp_phase9_disc_02';
    db.prepare(`
      INSERT OR REPLACE INTO companies (
        id, name, normalized_name, website, normalized_domain, industry, location,
        employee_size, employee_count, hiring_signals, current_tools, product_fit,
        lead_relevance_score, status, notes
      ) VALUES (
        ?, 'Legacy Manufacturing Ltd', 'legacymanufacturingltd', 'https://legacymfg.com', 'legacymfg.com',
        'Manufacturing & Logistics', 'Detroit, MI', '501-1000', 800,
        'Multiple open roles across factory ops',
        NULL, 'High', 85, 'Qualified', 'Manual attendance punching and paper payroll processes'
      )
    `).run(testCompanyId2);

    // Seed contacts
    const testContactId1 = 'cnt_phase9_disc_01';
    db.prepare(`
      INSERT OR REPLACE INTO contacts (
        id, company_id, name, email, phone, title, department, decision_maker, status
      ) VALUES (
        ?, ?, 'Jessica Pearson', 'jessica@apexstaffing.com', '+1-512-555-0199',
        'Chief People Officer', 'Human Resources', 1, 'Active'
      )
    `).run(testContactId1, testCompanyId1);

    const testContactId2 = 'cnt_phase9_disc_02';
    db.prepare(`
      INSERT OR REPLACE INTO contacts (
        id, company_id, name, email, phone, title, department, decision_maker, status
      ) VALUES (
        ?, ?, 'Harold Gunderson', 'harold@legacymfg.com', '+1-313-555-0188',
        'Payroll Specialist', 'Finance', 0, 'Active'
      )
    `).run(testContactId2, testCompanyId2);

    // Seed leads
    const testLeadId1 = 'ld_phase9_hireiq_01';
    db.prepare(`
      INSERT OR REPLACE INTO leads (
        id, company_id, contact_id, product, title, value, status, priority,
        hiring_volume, hiring_multiple_roles, manual_hr_processes, existing_tools,
        company_size, decision_maker_identified, qualification_score, qualification_notes,
        notes, source, ats_score
      ) VALUES (
        ?, ?, ?, 'Higher IQ', 'Apex Staffing - Bulk Hiring ATS Pipeline', 75000, 'New', 'High',
        'High', 1, 0, 'Workable, Excel', '201-500', 1, 92,
        'High volume hiring with resume screening and shortlisting requirements',
        'Target recruitment agency needing automated resume screening', 'LinkedIn', 88
      )
    `).run(testLeadId1, testCompanyId1, testContactId1);

    const testLeadId2 = 'ld_phase9_hrms_02';
    db.prepare(`
      INSERT OR REPLACE INTO leads (
        id, company_id, contact_id, product, title, value, status, priority,
        hiring_volume, hiring_multiple_roles, manual_hr_processes, existing_tools,
        company_size, decision_maker_identified, qualification_score, qualification_notes,
        notes, source
      ) VALUES (
        ?, ?, ?, 'HRMS Portal', 'Legacy Mfg - Payroll & Attendance Modernization', 54000, 'Contacted', 'Medium',
        'Medium', 0, 1, NULL, '501-1000', 0, 96,
        'Manual attendance and Excel HR processes in place',
        'Payroll and leave management modernization prospect', 'Website'
      )
    `).run(testLeadId2, testCompanyId2, testContactId2);

    // Add a pending follow-up for testLeadId1 (due tomorrow) and overdue follow-up for testLeadId2 (due yesterday)
    db.prepare(`
      INSERT OR REPLACE INTO follow_ups (
        id, lead_id, user_id, title, type, due_date, status, notes
      ) VALUES (
        'fu_phase9_01', ?, 'usr_admin_001', 'Follow-up with Jessica on ATS shortlisting',
        'Email', date('now', '+2 days'), 'Pending', 'Upcoming follow-up'
      )
    `).run(testLeadId1);

    db.prepare(`
      INSERT OR REPLACE INTO follow_ups (
        id, lead_id, user_id, title, type, due_date, status, notes
      ) VALUES (
        'fu_phase9_02', ?, 'usr_admin_001', 'Review Excel HR payroll demo',
        'Phone', date('now', '-2 days'), 'Pending', 'Overdue follow-up'
      )
    `).run(testLeadId2);
  });

  describe('1. Discovery Options & Metadata APIs', () => {
    it('should retrieve discovery options from /api/v1/discovery/options (200)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/options')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const data = res.body.data;

      // Verify all required metadata structures
      assert.ok(Array.isArray(data.leadSources), 'leadSources should be an array');
      assert.ok(Array.isArray(data.industries), 'industries should be an array');
      assert.ok(Array.isArray(data.products), 'products should be an array');
      assert.ok(Array.isArray(data.stages), 'stages should be an array');
      assert.ok(Array.isArray(data.priorities), 'priorities should be an array');
      assert.ok(Array.isArray(data.existingTools), 'existingTools should be an array');
      assert.ok(Array.isArray(data.employeeSizes), 'employeeSizes should be an array');
      assert.ok(Array.isArray(data.productFits), 'productFits should be an array');
      assert.ok(Array.isArray(data.followUpStatuses), 'followUpStatuses should be an array');
      assert.ok(data.leadSignals, 'leadSignals should exist');
      assert.ok(Array.isArray(data.leadSignals.hireIq), 'hireIq signals should be an array');
      assert.ok(Array.isArray(data.leadSignals.hrms), 'hrms signals should be an array');

      // Verify prompt-required existing tools
      const expectedTools = [
        'Excel',
        'greytHR',
        'Keka',
        'Zoho People',
        'Darwinbox',
        'Zoho Recruit',
        'Naukri RMS',
        'Workable',
        'Greenhouse',
        'No known tool',
      ];
      for (const tool of expectedTools) {
        assert.ok(data.existingTools.includes(tool), `Expected existingTools to include "${tool}"`);
      }

      // Verify prompt-required HireIQ signals
      const expectedHireIqSignals = [
        'Bulk hiring',
        'High-volume hiring',
        'Multiple open roles',
        'Resume screening',
        'Shortlisting',
        'ATS',
        'Recruitment agency',
        'Staffing',
        'RPO',
      ];
      for (const sig of expectedHireIqSignals) {
        assert.ok(data.leadSignals.hireIq.includes(sig), `Expected HireIQ signals to include "${sig}"`);
      }

      // Verify prompt-required HRMS signals
      const expectedHrmsSignals = [
        'Manual attendance',
        'Excel HR processes',
        'Payroll',
        'Leave management',
        'Employee records',
        'HRMS',
        'HR software',
      ];
      for (const sig of expectedHrmsSignals) {
        assert.ok(data.leadSignals.hrms.includes(sig), `Expected HRMS signals to include "${sig}"`);
      }
    });

    it('should retrieve discovery metadata through lead route alias /api/v1/leads/discovery/metadata (200)', async () => {
      const res = await request(app)
        .get('/api/v1/leads/discovery/metadata')
        .set('Authorization', `Bearer ${viewerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.existingTools.length > 0);
      assert.ok(res.body.data.leadSignals.hireIq.length > 0);
    });

    it('should provide individual dedicated discovery endpoints (200)', async () => {
      const [sourcesRes, indRes, prodRes, stagesRes, prioRes, toolsRes, sigsRes] = await Promise.all([
        request(app).get('/api/v1/discovery/lead-sources').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/v1/discovery/industries').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/v1/discovery/products').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/v1/discovery/stages').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/v1/discovery/priorities').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/v1/discovery/existing-tools').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/v1/discovery/lead-signals').set('Authorization', `Bearer ${adminToken}`),
      ]);

      assert.equal(sourcesRes.status, 200);
      assert.ok(Array.isArray(sourcesRes.body.data));
      assert.ok(sourcesRes.body.data.includes('LinkedIn'));

      assert.equal(indRes.status, 200);
      assert.ok(Array.isArray(indRes.body.data));
      assert.ok(indRes.body.data.includes('Staffing & Recruiting'));

      assert.equal(prodRes.status, 200);
      assert.deepEqual(prodRes.body.data, ['Higher IQ', 'HRMS Portal', 'Both']);

      assert.equal(stagesRes.status, 200);
      assert.ok(stagesRes.body.data.includes('New'));
      assert.ok(stagesRes.body.data.includes('Won'));

      assert.equal(prioRes.status, 200);
      assert.deepEqual(prioRes.body.data, ['High', 'Medium', 'Low']);

      assert.equal(toolsRes.status, 200);
      assert.ok(toolsRes.body.data.includes('Workable'));
      assert.ok(toolsRes.body.data.includes('No known tool'));

      assert.equal(sigsRes.status, 200);
      assert.ok(Array.isArray(sigsRes.body.data.hireIq));
      assert.ok(Array.isArray(sigsRes.body.data.hrms));
      assert.ok(sigsRes.body.data.hireIq.includes('Bulk hiring'));
      assert.ok(sigsRes.body.data.hrms.includes('Payroll'));
    });
  });

  describe('2. Empty Search & Partial Search', () => {
    it('should handle empty search string gracefully and return all active leads (200)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?search=')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length > 0);
      assert.ok(res.body.data.total >= 2);
    });

    it('should perform partial search across company, contact, and lead fields (200)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?search=Apex')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      const match = res.body.data.items.find(
        (item: { companyName: string }) => item.companyName === 'Apex Staffing Solutions'
      );
      assert.ok(match, 'Expected to find Apex Staffing Solutions');
    });

    it('should perform partial search matching contact name or email (200)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?search=jessica@apexstaffing.com')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      assert.equal(res.body.data.items[0].contactName, 'Jessica Pearson');
    });
  });

  describe('3. Multiple Filter Combinations', () => {
    it('should filter by Company (Industry, Location, Employee Size, Product Fit) + Lead (Product, Priority)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?industry=Staffing%20%26%20Recruiting&location=Austin&employeeSize=201-500&productFit=High&product=Higher%20IQ&priority=High')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      const lead = res.body.data.items[0];
      assert.equal(lead.companyIndustry, 'Staffing & Recruiting');
      assert.equal(lead.product, 'Higher IQ');
      assert.equal(lead.priority, 'High');
    });

    it('should filter by Contact (Job Title, Decision Maker)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?jobTitle=Chief%20People%20Officer&decisionMaker=true')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      assert.equal(res.body.data.items[0].contactDecisionMaker, true);
    });

    it('should filter by Existing Tool: Workable', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?existingTools=Workable')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      assert.ok(
        res.body.data.items[0].existingTools?.includes('Workable') ||
        res.body.data.items[0].companyCurrentTools?.includes('Workable')
      );
    });

    it('should filter by "No known tool" when company and lead have no tools configured', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?existingTools=No%20known%20tool')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      const mfgLead = res.body.data.items.find(
        (i: { companyName: string }) => i.companyName === 'Legacy Manufacturing Ltd'
      );
      assert.ok(mfgLead, 'Expected Legacy Manufacturing Ltd under "No known tool"');
    });

    it('should filter by HireIQ lead signals: Bulk hiring', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?leadSignals=Bulk%20hiring&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      const match = res.body.data.items.find(
        (i: { companyName: string }) => i.companyName === 'Apex Staffing Solutions'
      );
      assert.ok(match, 'Expected Apex Staffing to match Bulk hiring signal');
    });

    it('should filter by HRMS lead signals: Payroll', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?leadSignals=Payroll&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      const match = res.body.data.items.find(
        (i: { companyName: string }) => i.companyName === 'Legacy Manufacturing Ltd'
      );
      assert.ok(match, 'Expected Legacy Manufacturing to match Payroll signal');
    });

    it('should filter by Follow-up Status: Upcoming', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?followUpStatus=upcoming')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      const match = res.body.data.items.find((i: { id: string }) => i.id === 'ld_phase9_hireiq_01');
      assert.ok(match, 'Expected ld_phase9_hireiq_01 to be matched as upcoming follow-up');
    });

    it('should filter by Follow-up Status: Overdue', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?followUpStatus=overdue')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      const match = res.body.data.items.find((i: { id: string }) => i.id === 'ld_phase9_hrms_02');
      assert.ok(match, 'Expected ld_phase9_hrms_02 to be matched as overdue follow-up');
    });
  });

  describe('4. No Results Handling', () => {
    it('should return empty items array and total: 0 when no records match (200)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?search=QuantumNonExistentUnicorn9999&industry=Aerospace')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.items.length, 0);
      assert.equal(res.body.data.total, 0);
      assert.equal(res.body.data.totalPages, 1);
    });
  });

  describe('5. Pagination & Large Result Sets', () => {
    it('should handle pagination with page and limit parameters', async () => {
      const resPage1 = await request(app)
        .get('/api/v1/discovery/leads?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(resPage1.status, 200);
      assert.equal(resPage1.body.data.items.length, 2);
      assert.equal(resPage1.body.data.page, 1);
      assert.equal(resPage1.body.data.limit, 2);

      const resPage2 = await request(app)
        .get('/api/v1/discovery/leads?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(resPage2.status, 200);
      assert.equal(resPage2.body.data.page, 2);
      assert.notEqual(resPage1.body.data.items[0].id, resPage2.body.data.items[0].id);
    });

    it('should handle large result set requests up to limit=100 without server crash', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.items.length <= 100);
    });
  });

  describe('6. Sorting Behavior', () => {
    it('should sort leads by qualification score descending', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?sortBy=score&sortOrder=desc')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const items = res.body.data.items as Array<{ qualificationScore: number }>;
      assert.ok(items.length >= 2);
      assert.ok(items[0].qualificationScore >= items[1].qualificationScore);
    });

    it('should sort leads by title ascending', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const items = res.body.data.items as Array<{ title: string }>;
      assert.ok(items.length >= 2);
      assert.ok(items[0].title.localeCompare(items[1].title) <= 0);
    });
  });

  describe('7. Query Validation & Error Handling', () => {
    it('should reject invalid page parameter (400)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?page=0')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_PAGE_PARAMETER');
    });

    it('should reject excessive or negative limit parameter (400)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?limit=500')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_LIMIT_PARAMETER');
    });

    it('should reject invalid product value (400)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?product=InvalidProductX')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_PRODUCT_FILTER');
    });

    it('should reject invalid priority value (400)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?priority=UrgentMax')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_PRIORITY_FILTER');
    });

    it('should reject invalid follow-up status value (400)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?followUpStatus=Forgotten')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_FOLLOWUP_FILTER');
    });

    it('should reject invalid sort field (400)', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/leads?sortBy=password_hash')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_SORT_FIELD');
    });
  });

  describe('8. Existing APIs Integrity (Backward Compatibility)', () => {
    it('should ensure GET /api/v1/leads continues to support all original and new filters', async () => {
      const res = await request(app)
        .get('/api/v1/leads?product=Higher%20IQ&existingTools=Workable&followUpStatus=upcoming')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
    });

    it('should ensure GET /api/v1/companies supports Phase 9 hiringVolume, tools, and signals', async () => {
      const res = await request(app)
        .get('/api/v1/companies?hiringVolume=High&existingTools=Workable')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      assert.equal(res.body.data.items[0].name, 'Apex Staffing Solutions');
    });

    it('should ensure GET /api/v1/contacts supports Phase 9 jobTitle and decisionMaker', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?jobTitle=Chief%20People%20Officer&decisionMaker=true')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.items.length >= 1);
      assert.equal(res.body.data.items[0].name, 'Jessica Pearson');
    });
  });
});
