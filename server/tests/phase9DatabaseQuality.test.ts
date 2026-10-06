import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../app';
import { getDb } from '../db/database';
import { initDb } from '../db/migrate';
import { runMigrations, seedDatabase } from '../db/migrations';
import { DataQualityService, PHASE9_REQUIRED_INDEXES } from '../services/dataQualityService';
import { CompanyService } from '../services/companyService';
import { ContactService } from '../services/contactService';
import { LeadService } from '../services/leadService';

const app = createApp();

describe('Phase 9 — Database Optimization & Data Quality Test Suite', () => {
  let db: DatabaseSync;
  let adminToken: string;
  let dataQualityService: DataQualityService;
  let companyService: CompanyService;
  let contactService: ContactService;
  let leadService: LeadService;

  before(async () => {
    await initDb();
    db = getDb();

    dataQualityService = new DataQualityService(db);
    companyService = new CompanyService(db);
    contactService = new ContactService(db);
    leadService = new LeadService(db);

    // Clean up any redundant duplicate active leads left by previous test suites
    dataQualityService.deduplicateRedundantLeads();

    // Login as admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leadgen.com', password: 'Admin@12345' });

    assert.equal(loginRes.status, 200);
    adminToken = (loginRes.body as { data: { token: string } }).data.token;
  });

  describe('1. Review and Optimize Indexes Verification', () => {
    it('should verify all required Phase 9 indexes are created and active', () => {
      const indexCheck = dataQualityService.verifyIndexes();

      assert.equal(
        indexCheck.missingIndexes.length,
        0,
        `Missing indexes: ${indexCheck.missingIndexes.join(', ')}`
      );
      assert.equal(indexCheck.allVerified, true);
      assert.equal(indexCheck.totalFound, PHASE9_REQUIRED_INDEXES.length);
    });

    it('should verify specific indexes exist for all prompt-specified dimensions', () => {
      const existingIndexes = db
        .prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name IS NOT NULL")
        .all() as unknown as { name: string; tbl_name: string }[];
      const indexMap = new Map(existingIndexes.map((i) => [i.name, i.tbl_name]));

      // Company dimensions
      assert.equal(indexMap.get('idx_companies_name'), 'companies');
      assert.equal(indexMap.get('idx_companies_industry'), 'companies');
      assert.equal(indexMap.get('idx_companies_location'), 'companies');
      assert.equal(indexMap.get('idx_companies_employee_size'), 'companies');
      assert.equal(indexMap.get('idx_companies_current_tools'), 'companies');
      assert.equal(indexMap.get('idx_companies_hiring_signals'), 'companies');
      assert.equal(indexMap.get('idx_companies_product_fit'), 'companies');

      // Contact dimensions
      assert.equal(indexMap.get('idx_contacts_name'), 'contacts');
      assert.equal(indexMap.get('idx_contacts_email'), 'contacts');
      assert.equal(indexMap.get('idx_contacts_title'), 'contacts');
      assert.equal(indexMap.get('idx_contacts_decision_maker'), 'contacts');

      // Lead dimensions
      assert.equal(indexMap.get('idx_leads_source'), 'leads');
      assert.equal(indexMap.get('idx_leads_campaign_id'), 'leads');
      assert.equal(indexMap.get('idx_leads_product'), 'leads');
      assert.equal(indexMap.get('idx_leads_priority'), 'leads');
      assert.equal(indexMap.get('idx_leads_status'), 'leads');
      assert.equal(indexMap.get('idx_leads_existing_tools'), 'leads');
      assert.equal(indexMap.get('idx_leads_hiring_volume'), 'leads');

      // Follow-up date
      assert.equal(indexMap.get('idx_follow_ups_due_date'), 'follow_ups');
    });

    it('should verify query plans utilize indexes for search and filter queries', () => {
      // 1. Company query plan
      const companyPlan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM companies
          WHERE status = 'Qualified' AND industry = 'Staffing & Recruiting'
        `)
        .all() as unknown as { detail: string }[];
      const usesCompanyIndex = companyPlan.some((p) => p.detail.includes('USING INDEX'));
      assert.ok(usesCompanyIndex, `Expected company query to use index. Plan: ${JSON.stringify(companyPlan)}`);

      // 2. Contact query plan
      const contactPlan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM contacts
          WHERE company_id = 'cmp_001' AND decision_maker = 1
        `)
        .all() as unknown as { detail: string }[];
      const usesContactIndex = contactPlan.some((p) => p.detail.includes('USING INDEX'));
      assert.ok(usesContactIndex, `Expected contact query to use index. Plan: ${JSON.stringify(contactPlan)}`);

      // 3. Lead query plan
      const leadPlan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM leads
          WHERE status = 'New' AND product = 'Higher IQ'
        `)
        .all() as unknown as { detail: string }[];
      const usesLeadIndex = leadPlan.some((p) => p.detail.includes('USING INDEX'));
      assert.ok(usesLeadIndex, `Expected lead query to use index. Plan: ${JSON.stringify(leadPlan)}`);
    });
  });

  describe('2. Broken Foreign Keys & Orphan Records Check', () => {
    it('should verify PRAGMA foreign_key_check passes with 0 violations', () => {
      const fkCheck = dataQualityService.checkForeignKeys();
      assert.equal(fkCheck.passed, true);
      assert.equal(fkCheck.violationsCount, 0);
      assert.deepEqual(fkCheck.violations, []);
    });

    it('should verify zero orphan records across all relational tables', () => {
      const orphanCheck = dataQualityService.checkOrphans();
      assert.equal(orphanCheck.passed, true);
      assert.equal(orphanCheck.totalOrphans, 0);
      assert.equal(orphanCheck.orphanContactsCount, 0);
      assert.equal(orphanCheck.orphanLeadsCount, 0);
      assert.equal(orphanCheck.orphanFollowUpsCount, 0);
      assert.equal(orphanCheck.orphanActivitiesCount, 0);
      assert.equal(orphanCheck.orphanStageHistoryCount, 0);
    });
  });

  describe('3. Duplicate Handling for Companies, Contacts, and Leads', () => {
    it('should verify zero duplicate active records currently exist in the database', () => {
      const dupCheck = dataQualityService.checkDuplicates();
      assert.equal(dupCheck.duplicateCompaniesCount, 0);
      assert.equal(dupCheck.duplicateContactsCount, 0);
      assert.equal(dupCheck.duplicateActiveLeadsCount, 0);
      assert.equal(dupCheck.totalDuplicates, 0);
    });

    it('should prevent duplicate company creation by name and domain', () => {
      // Trying to create an identical company name
      assert.throws(
        () => {
          companyService.create({
            name: 'TechCorp Solutions',
            website: 'https://unique-domain-test.com',
            industry: 'Cloud & Cybersecurity',
            location: 'Bangalore, India',
            employeeSize: '51-200',
          });
        },
        (err: unknown) => {
          const e = err as { status?: number; code?: string };
          return e.status === 409 && e.code === 'DUPLICATE_COMPANY_NAME';
        }
      );

      // Trying to create an identical domain
      assert.throws(
        () => {
          companyService.create({
            name: 'Completely Different Name',
            website: 'https://techcorp.io',
            industry: 'Cloud & Cybersecurity',
            location: 'Bangalore, India',
            employeeSize: '51-200',
          });
        },
        (err: unknown) => {
          const e = err as { status?: number; code?: string };
          return e.status === 409 && e.code === 'DUPLICATE_COMPANY_DOMAIN';
        }
      );
    });

    it('should detect duplicate contacts by email within company', () => {
      const dupCheck = contactService.checkDuplicate('e.rostova@techcorp.io', 'cmp_techcorp_01');
      assert.equal(dupCheck.isDuplicate, true);
      assert.equal(dupCheck.existingContact?.email, 'e.rostova@techcorp.io');

      const nonDupCheck = contactService.checkDuplicate('new.unique.contact@techcorp.io', 'cmp_techcorp_01');
      assert.equal(nonDupCheck.isDuplicate, false);
    });

    it('should prevent duplicate active leads for the same company and product', () => {
      assert.throws(
        () => {
          leadService.create({
            companyId: 'cmp_techcorp_01',
            product: 'Higher IQ',
            title: 'Duplicate Opportunity Test',
          });
        },
        (err: unknown) => {
          const e = err as { status?: number; code?: string };
          return e.status === 409 && e.code === 'DUPLICATE_LEAD_EXISTS';
        }
      );
    });
  });

  describe('4. Null and Invalid Values Validation', () => {
    it('should verify database has zero invalid products, statuses, priorities, or scores', () => {
      const valCheck = dataQualityService.checkNullAndInvalidValues();
      assert.equal(valCheck.passed, true);
      assert.equal(valCheck.invalidProductsCount, 0);
      assert.equal(valCheck.invalidStatusesCount, 0);
      assert.equal(valCheck.invalidPrioritiesCount, 0);
      assert.equal(valCheck.invalidScoresCount, 0);
      assert.equal(valCheck.invalidProductFitsCount, 0);
      assert.equal(valCheck.nullCompanyNamesCount, 0);
    });
  });

  describe('5. Realistic Data Volumes & Query Optimization Stress Test', () => {
    it('should benchmark realistic volume dataset without sacrificing correctness or performance', async () => {
      // Create isolated in-memory test database for stress testing realistic volumes
      const testDb = new DatabaseSync(':memory:');
      runMigrations(testDb);
      await seedDatabase(testDb);

      // Seed 100 realistic companies
      const insertCompany = testDb.prepare(`
        INSERT INTO companies (
          id, name, normalized_name, website, normalized_domain, industry, location,
          employee_size, employee_count, hiring_signals, current_tools, product_fit,
          lead_relevance_score, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Qualified')
      `);

      const industries = ['Staffing & Recruiting', 'Software Development', 'Financial Services', 'Healthcare & Life Sciences', 'EdTech'];
      const locations = ['Austin, TX', 'San Francisco, CA', 'New York, NY', 'Bangalore, India', 'London, UK'];
      const sizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
      const tools = ['Workable, Excel', 'greytHR', 'Keka', 'Zoho People', 'Darwinbox', null];

      for (let i = 1; i <= 100; i++) {
        insertCompany.run(
          `bench_cmp_${i}`,
          `Enterprise Corp ${i}`,
          `enterprisecorp${i}`,
          `https://enterprise${i}.com`,
          `enterprise${i}.com`,
          industries[i % industries.length],
          locations[i % locations.length],
          sizes[i % sizes.length],
          100 + i * 5,
          i % 2 === 0 ? 'Bulk hiring 15+ roles with automated resume screening' : 'Manual payroll and attendance',
          tools[i % tools.length],
          i % 3 === 0 ? 'High' : 'Medium',
          70 + (i % 30)
        );
      }

      // Seed 200 realistic contacts
      const insertContact = testDb.prepare(`
        INSERT INTO contacts (id, company_id, name, email, title, decision_maker, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Active')
      `);

      const titles = ['VP Talent Acquisition', 'Head of People Ops', 'Recruitment Director', 'CFO', 'HR Manager'];
      for (let i = 1; i <= 200; i++) {
        const compId = `bench_cmp_${(i % 100) + 1}`;
        insertContact.run(
          `bench_cnt_${i}`,
          compId,
          `Executive ${i}`,
          `exec${i}@enterprise${(i % 100) + 1}.com`,
          titles[i % titles.length],
          i % 2 === 0 ? 1 : 0
        );
      }

      // Seed 300 realistic leads
      const insertLead = testDb.prepare(`
        INSERT INTO leads (
          id, company_id, contact_id, product, title, value, status, priority,
          hiring_volume, qualification_score, source, existing_tools
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const products = ['Higher IQ', 'HRMS Portal', 'Both'];
      const stages = ['New', 'Contacted', 'Replied', 'Demo Booked', 'Demo Done', 'Won', 'Lost'];
      const priorities = ['High', 'Medium', 'Low'];

      for (let i = 1; i <= 300; i++) {
        const compId = `bench_cmp_${(i % 100) + 1}`;
        const cntId = `bench_cnt_${(i % 200) + 1}`;
        insertLead.run(
          `bench_ld_${i}`,
          compId,
          cntId,
          products[i % products.length],
          `Lead Opportunity ${i}`,
          25000 + i * 150,
          stages[i % stages.length],
          priorities[i % priorities.length],
          i % 2 === 0 ? 'High' : 'Medium',
          50 + (i % 50),
          'LinkedIn',
          tools[i % tools.length]
        );
      }

      // Seed 150 follow-ups
      const insertFollowUp = testDb.prepare(`
        INSERT INTO follow_ups (id, lead_id, user_id, title, type, due_date, status)
        VALUES (?, ?, 'usr_admin_001', 'Cadence check', 'Email', date('now', '+2 days'), ?)
      `);

      for (let i = 1; i <= 150; i++) {
        insertFollowUp.run(`bench_fu_${i}`, `bench_ld_${i}`, i % 3 === 0 ? 'Completed' : 'Pending');
      }

      // Update query statistics
      testDb.exec('ANALYZE;');

      // Benchmark multifaceted discovery query
      const t0 = performance.now();
      const results = testDb
        .prepare(`
          SELECT 
            l.id, l.title, l.value, l.status, l.priority, l.qualification_score,
            c.name as company_name, c.industry, c.location,
            cnt.name as contact_name, cnt.decision_maker
          FROM leads l
          JOIN companies c ON l.company_id = c.id
          LEFT JOIN contacts cnt ON l.contact_id = cnt.id
          WHERE l.status IN ('New', 'Contacted', 'Replied')
            AND l.product = 'Higher IQ'
            AND c.industry = 'Staffing & Recruiting'
          ORDER BY l.qualification_score DESC
          LIMIT 25 OFFSET 0
        `)
        .all();
      const elapsedMs = performance.now() - t0;

      assert.ok(elapsedMs < 50, `Expected search query to execute in under 50ms, took ${elapsedMs.toFixed(2)}ms`);
      assert.ok(results.length > 0, 'Expected matching results from benchmark dataset');
      assert.equal(results[0].status !== undefined, true);
    });
  });

  describe('6. Data Quality Audit API Endpoint', () => {
    it('should return 200 and healthy audit report from GET /api/v1/discovery/quality-audit', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/quality-audit')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const audit = res.body.data;

      assert.equal(audit.isHealthy, true);
      assert.equal(audit.indexes.allVerified, true);
      assert.equal(audit.foreignKeys.passed, true);
      assert.equal(audit.orphans.passed, true);
      assert.equal(audit.validations.passed, true);
      assert.ok(audit.tableRowCounts.companies > 0);
      assert.ok(audit.tableRowCounts.leads > 0);
      assert.ok(audit.benchmarks.leadSearchMs >= 0);
    });
  });

  describe('7. Data Preservation Verification', () => {
    it('should verify existing production seed data has not been deleted or corrupted', () => {
      // Verify baseline core enterprise companies exist
      const techCorp = db
        .prepare("SELECT * FROM companies WHERE normalized_domain = 'techcorp.io'")
        .get() as unknown as { name: string } | undefined;
      assert.ok(techCorp, 'Expected techcorp.io to exist');
      assert.equal(techCorp?.name, 'TechCorp Solutions');

      const finPulse = db
        .prepare("SELECT * FROM companies WHERE normalized_domain = 'finpulse.com'")
        .get() as unknown as { name: string } | undefined;
      assert.ok(finPulse, 'Expected finpulse.com to exist');
      assert.equal(finPulse?.name, 'FinPulse Capital');

      // Verify baseline core contacts exist
      const elena = db
        .prepare("SELECT * FROM contacts WHERE email = 'e.rostova@techcorp.io'")
        .get() as unknown as { name: string } | undefined;
      assert.ok(elena, 'Expected Elena Rostova contact to exist');
      assert.equal(elena?.name, 'Elena Rostova');

      // Verify baseline core users exist
      const admin = db
        .prepare("SELECT * FROM users WHERE email = 'admin@leadgen.com'")
        .get() as unknown as { first_name: string } | undefined;
      assert.ok(admin, 'Expected admin user to exist');
    });
  });
});
