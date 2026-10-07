import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../app';
import { getDb } from '../db/database';
import { initDb } from '../db/migrate';
import { CompanyService } from '../services/companyService';
import { ContactService } from '../services/contactService';
import { LeadService } from '../services/leadService';
import { OutreachService } from '../services/outreachService';
import { ReportingService } from '../services/reportingService';

const app = createApp();

describe('Phase 10 — Final Database Integrity & Production Review Test Suite', () => {
  let db: DatabaseSync;
  let adminToken: string;
  let companyService: CompanyService;
  let contactService: ContactService;
  let leadService: LeadService;
  let outreachService: OutreachService;
  let reportingService: ReportingService;

  before(async () => {
    await initDb();
    db = getDb();

    companyService = new CompanyService(db);
    contactService = new ContactService(db);
    leadService = new LeadService(db);
    outreachService = new OutreachService(db);
    reportingService = new ReportingService(db);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leadgen.com', password: 'Admin@12345' });

    assert.equal(loginRes.status, 200);
    adminToken = (loginRes.body as { data: { token: string } }).data.token;
  });

  describe('1. Migration Sequence & Database Engine Integrity', () => {
    it('should confirm all 9 migrations are executed and recorded in _migrations', () => {
      const rows = db.prepare('SELECT id, name FROM _migrations ORDER BY id ASC').all() as unknown as {
        id: string;
        name: string;
      }[];
      const appliedIds = rows.map((r) => r.id);

      const expectedMigrations = [
        '001_create_auth_tables',
        '002_create_companies_and_relations_tables',
        '003_enhance_contacts_schema',
        '004_enhance_leads_qualification_schema',
        '005_lead_pipeline_and_stage_history',
        '006_outreach_and_follow_ups',
        '007_campaigns_templates_reporting',
        '008_phase9_search_optimization_and_data_quality',
        '009_phase10_final_database_integrity_and_production_review',
      ];

      for (const expected of expectedMigrations) {
        assert.ok(appliedIds.includes(expected), `Migration ${expected} should be applied`);
      }
      assert.equal(appliedIds.length >= 9, true);
    });

    it('should verify PRAGMA integrity_check returns ok', () => {
      const integrity = db.prepare('PRAGMA integrity_check').all() as unknown as { integrity_check: string }[];
      assert.equal(integrity.length, 1);
      assert.equal(integrity[0].integrity_check, 'ok');
    });

    it('should verify PRAGMA foreign_key_check returns zero violations', () => {
      const fkViolations = db.prepare('PRAGMA foreign_key_check').all();
      assert.equal(fkViolations.length, 0, `FK violations detected: ${JSON.stringify(fkViolations)}`);
    });

    it('should verify all 15 core production tables exist in sqlite_master', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
        .all() as unknown as { name: string }[];
      const tableNames = new Set(tables.map((t) => t.name));

      const requiredTables = [
        '_migrations',
        'users',
        'roles',
        'permissions',
        'role_permissions',
        'sessions',
        'companies',
        'contacts',
        'leads',
        'lead_stage_history',
        'activities',
        'follow_ups',
        'campaigns',
        'outreach_templates',
        'weekly_targets',
      ];

      for (const req of requiredTables) {
        assert.ok(tableNames.has(req), `Table ${req} must exist`);
      }
    });
  });

  describe('2. Foreign Key Integrity & Orphan Records Zero-Check', () => {
    it('should verify zero orphan sessions without corresponding users', () => {
      const count = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM sessions s LEFT JOIN users u ON s.user_id = u.id WHERE u.id IS NULL`
          )
          .get() as { count: number }
      ).count;
      assert.equal(count, 0);
    });

    it('should verify zero orphan contacts without corresponding companies', () => {
      const count = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM contacts c LEFT JOIN companies comp ON c.company_id = comp.id WHERE comp.id IS NULL`
          )
          .get() as { count: number }
      ).count;
      assert.equal(count, 0);
    });

    it('should verify zero orphan leads without corresponding companies', () => {
      const count = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM leads l LEFT JOIN companies c ON l.company_id = c.id WHERE c.id IS NULL`
          )
          .get() as { count: number }
      ).count;
      assert.equal(count, 0);
    });

    it('should verify zero orphan leads referencing non-existent contacts', () => {
      const count = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM leads l LEFT JOIN contacts c ON l.contact_id = c.id WHERE l.contact_id IS NOT NULL AND c.id IS NULL`
          )
          .get() as { count: number }
      ).count;
      assert.equal(count, 0);
    });

    it('should verify zero orphan lead_stage_history records', () => {
      const count = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM lead_stage_history h LEFT JOIN leads l ON h.lead_id = l.id WHERE l.id IS NULL`
          )
          .get() as { count: number }
      ).count;
      assert.equal(count, 0);
    });

    it('should verify zero orphan activities records', () => {
      const count = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM activities a LEFT JOIN leads l ON a.lead_id = l.id WHERE l.id IS NULL`
          )
          .get() as { count: number }
      ).count;
      assert.equal(count, 0);
    });

    it('should verify zero orphan follow_ups records', () => {
      const count = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM follow_ups f LEFT JOIN leads l ON f.lead_id = l.id WHERE l.id IS NULL`
          )
          .get() as { count: number }
      ).count;
      assert.equal(count, 0);
    });

    it('should verify zero orphan role_permissions records', () => {
      const count = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM role_permissions rp
             LEFT JOIN roles r ON rp.role_id = r.id
             LEFT JOIN permissions p ON rp.permission_id = p.id
             WHERE r.id IS NULL OR p.id IS NULL`
          )
          .get() as { count: number }
      ).count;
      assert.equal(count, 0);
    });
  });

  describe('3. Check Constraints, Data Hygiene & Null Value Invariants', () => {
    it('should enforce contacts status check constraint and allow Do Not Contact', () => {
      const validStatuses = ['Active', 'Contacted', 'Qualified', 'Unresponsive', 'Do Not Contact', 'Archived'];
      for (const st of validStatuses) {
        const id = `cnt_test_chk_${Math.random().toString(36).substring(7)}`;
        db.prepare(`
          INSERT INTO contacts (id, company_id, name, email, status)
          VALUES (?, 'cmp_techcorp_01', 'Test Status', 'test_${id}@chk.com', ?)
        `).run(id, st);

        const row = db.prepare('SELECT status FROM contacts WHERE id = ?').get(id) as { status: string };
        assert.equal(row.status, st);
        db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
      }

      assert.throws(() => {
        db.prepare(`
          INSERT INTO contacts (id, company_id, name, email, status)
          VALUES ('cnt_inv_chk', 'cmp_techcorp_01', 'Invalid', 'inv@chk.com', 'InvalidStatus')
        `).run();
      });
    });

    it('should ensure all Won leads in the database have won_at timestamp', () => {
      const wonWithoutWonAt = (
        db
          .prepare(`SELECT COUNT(*) as count FROM leads WHERE status = 'Won' AND won_at IS NULL`)
          .get() as { count: number }
      ).count;
      assert.equal(wonWithoutWonAt, 0, 'Every Won lead must have won_at timestamp populated');
    });

    it('should ensure all Lost leads have lost_at and lost_reason populated', () => {
      const lostWithoutMeta = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM leads WHERE status = 'Lost' AND (lost_at IS NULL OR lost_reason IS NULL OR TRIM(lost_reason) = '')`
          )
          .get() as { count: number }
      ).count;
      assert.equal(lostWithoutMeta, 0, 'Every Lost lead must have lost_at and lost_reason populated');
    });

    it('should ensure all Completed follow-ups have completed_at timestamp', () => {
      const completedWithoutTs = (
        db
          .prepare(`SELECT COUNT(*) as count FROM follow_ups WHERE status = 'Completed' AND completed_at IS NULL`)
          .get() as { count: number }
      ).count;
      assert.equal(completedWithoutTs, 0, 'Every Completed follow-up must have completed_at populated');
    });
  });

  describe('4. Phase 10 Composite Performance Indexes & Query Plans', () => {
    it('should verify all Phase 10 indexes are created and present in sqlite_master', () => {
      const indexes = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
        .all() as unknown as { name: string }[];
      const indexNames = new Set(indexes.map((i) => i.name));

      const requiredPhase10Indexes = [
        'idx_lead_history_lead_created',
        'idx_lead_history_to_stage',
        'idx_activities_user_date',
        'idx_activities_lead_date',
        'idx_campaigns_status_product',
        'idx_templates_product_status',
        'idx_leads_source_status',
        'idx_leads_campaign_status',
        'idx_weekly_targets_user_dates',
        'idx_weekly_targets_unique_user',
        'idx_weekly_targets_unique_global',
      ];

      for (const idx of requiredPhase10Indexes) {
        assert.ok(indexNames.has(idx), `Index ${idx} must exist`);
      }
    });

    it('should verify query plans use composite indexes for high-frequency queries', () => {
      // 1. Stage history audit lookup
      const historyPlan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM lead_stage_history
          WHERE lead_id = 'ld_001'
          ORDER BY created_at DESC
        `)
        .all() as unknown as { detail: string }[];

      const historyPlanText = historyPlan.map((p) => p.detail).join(' ');
      assert.ok(
        historyPlanText.includes('idx_lead_history_lead_created') || historyPlanText.includes('idx_lead_history_lead_id'),
        `History query plan should use lead history index: ${historyPlanText}`
      );

      // 2. Activities user and date lookup
      const activityPlan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM activities
          WHERE user_id = 'usr_sales_001' AND activity_date >= '2026-10-01'
        `)
        .all() as unknown as { detail: string }[];

      const activityPlanText = activityPlan.map((p) => p.detail).join(' ');
      assert.ok(
        activityPlanText.includes('idx_activities_user_date') || activityPlanText.includes('idx_activities_user_id'),
        `Activity query plan should use activity index: ${activityPlanText}`
      );
    });
  });

  describe('5. Duplicate Prevention & Unique Constraints', () => {
    it('should prevent duplicate weekly targets for the same user and week interval', () => {
      const type = 'outreach';
      const start = '2026-11-02';
      const end = '2026-11-08';
      const userId = 'usr_sales_001';

      // Insert first target
      const id1 = `wt_test_dup_${Math.random().toString(36).substring(7)}`;
      db.prepare(`
        INSERT INTO weekly_targets (id, target_type, target_value, user_id, start_date, end_date)
        VALUES (?, ?, 50, ?, ?, ?)
      `).run(id1, type, userId, start, end);

      // Attempt duplicate target for same user & week
      const id2 = `wt_test_dup_${Math.random().toString(36).substring(7)}`;
      assert.throws(
        () => {
          db.prepare(`
            INSERT INTO weekly_targets (id, target_type, target_value, user_id, start_date, end_date)
            VALUES (?, ?, 75, ?, ?, ?)
          `).run(id2, type, userId, start, end);
        },
        /UNIQUE constraint failed/,
        'Should reject duplicate user weekly target'
      );

      // Cleanup
      db.prepare('DELETE FROM weekly_targets WHERE id = ?').run(id1);
    });

    it('should prevent duplicate global weekly targets for the same week interval', () => {
      const type = 'companies';
      const start = '2026-11-02';
      const end = '2026-11-08';

      // Insert first global target
      const id1 = `wt_test_glob_${Math.random().toString(36).substring(7)}`;
      db.prepare(`
        INSERT INTO weekly_targets (id, target_type, target_value, user_id, start_date, end_date)
        VALUES (?, ?, 30, NULL, ?, ?)
      `).run(id1, type, start, end);

      // Attempt duplicate global target for same week
      const id2 = `wt_test_glob_${Math.random().toString(36).substring(7)}`;
      assert.throws(
        () => {
          db.prepare(`
            INSERT INTO weekly_targets (id, target_type, target_value, user_id, start_date, end_date)
            VALUES (?, ?, 40, NULL, ?, ?)
          `).run(id2, type, start, end);
        },
        /UNIQUE constraint failed/,
        'Should reject duplicate global weekly target'
      );

      // Cleanup
      db.prepare('DELETE FROM weekly_targets WHERE id = ?').run(id1);
    });
  });

  describe('6. Do Not Contact Status & Compliance Protection', () => {
    it('should verify seeded contact cnt_012 exists with Do Not Contact status', () => {
      const contact = contactService.getById('cnt_012');
      assert.ok(contact, 'cnt_012 should exist in database');
      assert.equal(contact.name, 'Arthur Pendelton');
      assert.equal(contact.status, 'Do Not Contact');
    });

    it('should automatically cancel pending follow-ups when contact is marked Do Not Contact', async () => {
      // 1. Create a company, contact, and lead
      const comp = companyService.create(
        {
          name: `DNC Test Corp ${Date.now()}`,
          website: `https://dnctest-${Date.now()}.com`,
          industry: 'Software',
          location: 'New York, NY',
          employeeSize: '100-250',
        },
        'usr_admin_001'
      );
      const cnt = contactService.create(
        {
          companyId: comp.id,
          name: 'DNC Test Person',
          title: 'VP of Engineering',
          email: `person-${Date.now()}@dnc.com`,
        },
        'usr_admin_001'
      );
      const ld = leadService.create(
        {
          companyId: comp.id,
          contactId: cnt.id,
          title: 'DNC Follow-up Lead',
          product: 'Higher IQ',
          value: 20000,
        },
        'usr_admin_001'
      );

      // 2. Schedule a pending follow-up
      const flw = outreachService.createFollowUp(
        'usr_admin_001',
        {
          leadId: ld.id,
          title: 'Check In Phone Call',
          type: 'Phone',
          dueDate: '2026-10-15',
        }
      );
      assert.equal(flw.status, 'Pending');

      // 3. Update contact status to 'Do Not Contact'
      contactService.update(cnt.id, { status: 'Do Not Contact' }, 'usr_admin_001');

      // 4. Verify the follow-up was automatically cancelled
      const flwAfter = outreachService.getFollowUpById(flw.id);
      assert.ok(flwAfter);
      assert.equal(flwAfter.status, 'Cancelled');
      assert.ok(flwAfter.notes?.includes('Do Not Contact'));
    });

    it('should block creating new activity for a lead linked to a Do Not Contact contact', async () => {
      // Setup DNC lead
      const comp = companyService.create(
        {
          name: `DNC Block Act Corp ${Date.now()}`,
          website: `https://dnc-block-${Date.now()}.com`,
          industry: 'Software',
          location: 'San Jose, CA',
          employeeSize: '51-100',
        },
        'usr_admin_001'
      );
      const cnt = contactService.create(
        {
          companyId: comp.id,
          name: 'Blocked Person',
          title: 'CTO',
          email: `blocked-${Date.now()}@dnc.com`,
          status: 'Do Not Contact',
        },
        'usr_admin_001'
      );
      const ld = leadService.create(
        {
          companyId: comp.id,
          contactId: cnt.id,
          title: 'Blocked Activity Lead',
          product: 'HRMS Portal',
          value: 15000,
        },
        'usr_admin_001'
      );

      // Attempt to create activity via API
      const res = await request(app)
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadId: ld.id,
          type: 'Email',
          subject: 'Unwanted outreach pitch',
          notes: 'Attempting outreach to DNC prospect',
          activityDate: new Date().toISOString(),
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'DO_NOT_CONTACT_VIOLATION');
      assert.ok(res.body.message.includes('Do Not Contact'));
    });

    it('should block creating new follow-up for a lead linked to a Do Not Contact contact', async () => {
      // Setup DNC lead
      const comp = companyService.create(
        {
          name: `DNC Block Flw Corp ${Date.now()}`,
          website: `https://dnc-flw-${Date.now()}.com`,
          industry: 'Fintech',
          location: 'Chicago, IL',
          employeeSize: '201-500',
        },
        'usr_admin_001'
      );
      const cnt = contactService.create(
        {
          companyId: comp.id,
          name: 'Blocked Follow-up Person',
          title: 'Head of Talent',
          email: `flw-blocked-${Date.now()}@dnc.com`,
          status: 'Do Not Contact',
        },
        'usr_admin_001'
      );
      const ld = leadService.create(
        {
          companyId: comp.id,
          contactId: cnt.id,
          title: 'Blocked Follow-up Lead',
          product: 'Both',
          value: 30000,
        },
        'usr_admin_001'
      );

      // Attempt to schedule follow-up via API
      const res = await request(app)
        .post('/api/v1/follow-ups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadId: ld.id,
          title: 'Follow-up touch',
          type: 'LinkedIn',
          dueDate: '2026-10-20',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'DO_NOT_CONTACT_VIOLATION');
      assert.ok(res.body.message.includes('Do Not Contact'));
    });
  });

  describe('7. Reporting Aggregations vs Raw Database Record Parity', () => {
    it('should verify reporting overview KPIs match exact SQL database counts', () => {
      const overview = reportingService.getOverview();

      // Total Leads
      const dbTotalLeads = (db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }).count;
      assert.equal(overview.summary.leadsCreated, dbTotalLeads, 'Overview total leads must equal raw DB count');

      // Total Won Leads
      const dbWonLeads = (
        db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'Won'").get() as { count: number }
      ).count;
      assert.equal(overview.summary.won, dbWonLeads, 'Overview won leads must equal raw DB count');

      // Total Lost Leads
      const dbLostLeads = (
        db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'Lost'").get() as { count: number }
      ).count;
      assert.equal(overview.summary.lost, dbLostLeads, 'Overview lost leads must equal raw DB count');

      // Pipeline Total Value (sum of all leads created in period)
      const dbPipelineValue = (
        db.prepare('SELECT COALESCE(SUM(value), 0) as val FROM leads').get() as { val: number }
      ).val;
      assert.equal(overview.summary.totalPipelineValue, dbPipelineValue, 'Pipeline value must equal raw DB sum');

      // Companies & Contacts counts
      const dbCompanies = (db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number }).count;
      assert.equal(overview.summary.companiesAdded, dbCompanies);

      const dbContacts = (db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number }).count;
      assert.equal(overview.summary.contactsFound, dbContacts);
    });

    it('should verify leads by product match exact group-by SQL counts', () => {
      const overview = reportingService.getOverview();
      const dbProductCounts = db
        .prepare('SELECT product, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM leads GROUP BY product')
        .all() as unknown as { product: string; count: number; total_value: number }[];

      const dbMap = new Map(dbProductCounts.map((s) => [s.product, { count: s.count, val: s.total_value }]));

      for (const item of overview.leadsByProduct) {
        const fromDb = dbMap.get(item.product);
        if (fromDb) {
          assert.equal(item.count, fromDb.count, `Product ${item.product} count mismatch`);
        }
      }
    });

    it('should verify source performance matches exact group-by SQL counts', () => {
      const overview = reportingService.getOverview();
      const dbSourceCounts = db
        .prepare('SELECT COALESCE(source, \'Unknown\') as source, COUNT(*) as count FROM leads GROUP BY source')
        .all() as unknown as { source: string; count: number }[];

      const dbMap = new Map(dbSourceCounts.map((s) => [s.source, s.count]));

      for (const sp of overview.leadsBySource) {
        const expectedCount = dbMap.get(sp.source) || 0;
        assert.equal(sp.count, expectedCount, `Source ${sp.source} count mismatch`);
      }
    });
  });

  describe('8. Realistic End-to-End Database Lifecycle Execution', () => {
    it('should execute end-to-end IT Mapping lifecycle with audit history and referential stability', async () => {
      // 1. Create company
      const companyRes = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Phase 10 E2E Tech Inc ${Date.now()}`,
          website: `https://p10e2e-${Date.now()}.com`,
          industry: 'IT & Cloud Services',
          location: 'Bangalore, India',
          employeeSize: '501-1000',
        });
      assert.equal(companyRes.status, 201);
      const companyId = companyRes.body.data.id;

      // 2. Create contact
      const contactRes = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId,
          name: 'Kavita Menon',
          email: `kavita-${Date.now()}@p10e2e.com`,
          title: 'VP of Human Resources',
          decisionMaker: 1,
        });
      assert.equal(contactRes.status, 201);
      const contactId = contactRes.body.data.id;

      // 3. Create lead
      const leadRes = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId,
          contactId,
          title: 'Enterprise HRMS Modernization',
          product: 'HRMS Portal',
          value: 75000,
          priority: 'High',
        });
      assert.equal(leadRes.status, 201);
      const leadId = leadRes.body.data.id;

      // 4. Log outreach activity
      const activityRes = await request(app)
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadId,
          type: 'Email',
          subject: 'Day 1 — HRMS Portal Value proposition',
          notes: 'Sent initial discovery email and deck',
          activityDate: new Date().toISOString(),
        });
      assert.equal(activityRes.status, 201);

      // 5. Advance lead stage New -> Contacted -> Replied
      const step1 = await request(app)
        .patch(`/api/v1/leads/${leadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'Contacted', notes: 'First contact attempt' });
      assert.equal(step1.status, 200);

      const step2 = await request(app)
        .patch(`/api/v1/leads/${leadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'Replied', notes: 'Prospect replied via email' });
      assert.equal(step2.status, 200);

      // 6. Schedule follow-up
      const followUpRes = await request(app)
        .post('/api/v1/follow-ups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadId,
          title: 'Day 6: Demo Follow-up Call',
          type: 'Phone',
          dueDate: new Date().toISOString().split('T')[0],
        });
      assert.equal(followUpRes.status, 201);
      const followUpId = followUpRes.body.data.id;

      // 7. Verify audit history exists for the lead
      const historyRows = db
        .prepare('SELECT to_stage FROM lead_stage_history WHERE lead_id = ? ORDER BY created_at ASC')
        .all(leadId) as unknown as { to_stage: string }[];
      assert.ok(historyRows.length >= 2, 'Should record at least 2 stage transitions');

      // 8. Contact requests Do Not Contact -> verify follow-up auto-cancelled
      const patchRes = await request(app)
        .patch(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Do Not Contact' });
      assert.equal(patchRes.status, 200);

      const followUpCheck = outreachService.getFollowUpById(followUpId);
      assert.equal(followUpCheck?.status, 'Cancelled');

      // 9. Verify zero orphan records remain in DB
      const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
      assert.equal(fkCheck.length, 0);
    });
  });
});
