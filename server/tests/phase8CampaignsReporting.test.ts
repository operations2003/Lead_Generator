process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { initDb } from '../db/migrate';

const app = createApp();

describe('Phase 8 — Campaigns, Lead Sources & Reporting Test Suite', () => {
  let adminToken: string;
  let viewerToken: string;
  let createdCampaignId: string;
  let createdTemplateId: string;

  before(async () => {
    await initDb();

    // Login admin (full write permissions)
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

  describe('1. Campaign APIs & Lead Funnel Metrics', () => {
    it('should reject unauthenticated campaign creation (401)', async () => {
      const res = await request(app)
        .post('/api/v1/campaigns')
        .send({
          name: 'Unauthorized Campaign',
          product: 'HireIQ',
          startDate: '2026-10-01',
        });
      assert.strictEqual(res.status, 401);
    });

    it('should reject campaign creation from viewer without write permissions (403)', async () => {
      const res = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Viewer Campaign',
          product: 'HireIQ',
          startDate: '2026-10-01',
        });
      assert.strictEqual(res.status, 403);
    });

    it('should reject campaign creation with missing required name (400)', async () => {
      const res = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product: 'HireIQ',
          startDate: '2026-10-01',
        });
      assert.strictEqual(res.status, 400);
    });

    it('should successfully create a new campaign (201)', async () => {
      const res = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'FinTech TA Automation Drive 2026',
          product: 'HireIQ',
          targetAudience: 'Heads of Talent Acquisition',
          industry: 'FinTech',
          location: 'Mumbai & Bangalore',
          leadSource: 'LinkedIn',
          startDate: '2026-10-01',
          endDate: '2026-12-31',
          status: 'Active',
          notes: 'High-growth fintech recruitment automation sprint',
        });

      assert.strictEqual(res.status, 201);
      const data = (res.body as { data: { id: string; name: string; total_leads: number; conversion_rate: number } }).data;
      assert.ok(data.id);
      assert.strictEqual(data.name, 'FinTech TA Automation Drive 2026');
      assert.strictEqual(typeof data.total_leads, 'number');
      assert.strictEqual(typeof data.conversion_rate, 'number');
      createdCampaignId = data.id;
    });

    it('should list campaigns with pagination and live metrics (200)', async () => {
      const res = await request(app)
        .get('/api/v1/campaigns?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const body = res.body as { data: { items: Array<{ id: string; name: string; total_leads: number }>; total: number } };
      assert.ok(Array.isArray(body.data.items));
      assert.ok(body.data.total >= 1);
    });

    it('should filter campaigns by product and status (200)', async () => {
      const res = await request(app)
        .get('/api/v1/campaigns?status=Active&product=HireIQ')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const body = res.body as { data: { items: Array<{ product: string; status: string }> } };
      assert.ok(body.data.items.every((c) => c.status === 'Active'));
    });

    it('should retrieve single campaign with complete lead funnel metrics (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/campaigns/${createdCampaignId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = (res.body as {
        data: {
          id: string;
          total_leads: number;
          new_leads: number;
          contacted: number;
          replies: number;
          demos_booked: number;
          demos_completed: number;
          won: number;
          lost: number;
          follow_ups_due: number;
          conversion_rate: number;
        };
      }).data;
      assert.strictEqual(data.id, createdCampaignId);
      assert.strictEqual(typeof data.total_leads, 'number');
      assert.strictEqual(typeof data.new_leads, 'number');
      assert.strictEqual(typeof data.contacted, 'number');
      assert.strictEqual(typeof data.replies, 'number');
      assert.strictEqual(typeof data.demos_booked, 'number');
      assert.strictEqual(typeof data.won, 'number');
      assert.strictEqual(typeof data.conversion_rate, 'number');
    });

    it('should update campaign details (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/campaigns/${createdCampaignId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetAudience: 'VP Engineering & Talent Directors',
          notes: 'Updated target criteria',
        });

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { target_audience: string; notes: string } }).data;
      assert.strictEqual(data.target_audience, 'VP Engineering & Talent Directors');
      assert.strictEqual(data.notes, 'Updated target criteria');
    });

    it('should archive campaign (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/campaigns/${createdCampaignId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { status: string } }).data;
      assert.strictEqual(data.status, 'Archived');
    });
  });

  describe('2. Outreach Sequence Templates APIs', () => {
    it('should retrieve seeded 15-day cadence templates (200)', async () => {
      const res = await request(app)
        .get('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const items = (res.body as { data: Array<{ id: string; name: string; type: string; sequence_day: number | null }> }).data;
      assert.ok(items.length >= 7);

      const hasDay1 = items.some((t) => t.type === 'Initial Email');
      const hasDay3 = items.some((t) => t.type === 'LinkedIn Message');
      const hasDay6 = items.some((t) => t.type === 'Call Script');
      const hasDay10 = items.some((t) => t.type === 'Follow-up Email');
      const hasDay15 = items.some((t) => t.type === 'Final Follow-up');

      assert.ok(hasDay1, 'Should have Day 1 Initial Email template');
      assert.ok(hasDay3, 'Should have Day 3 LinkedIn template');
      assert.ok(hasDay6, 'Should have Day 6 Call script template');
      assert.ok(hasDay10, 'Should have Day 10 Follow-up email template');
      assert.ok(hasDay15, 'Should have Day 15 Final follow-up template');
    });

    it('should create a custom outreach template (201)', async () => {
      const res = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Custom Enterprise HRMS Demo Follow-up',
          type: 'Demo Follow-up',
          product: 'HRMS',
          subject: 'Recap of HRMS Architecture & Next Steps for {{company}}',
          body: 'Hi {{firstName}},\n\nThank you for reviewing our multi-entity HRMS today...',
        });

      assert.strictEqual(res.status, 201);
      const data = (res.body as { data: { id: string; name: string; type: string } }).data;
      assert.ok(data.id);
      assert.strictEqual(data.name, 'Custom Enterprise HRMS Demo Follow-up');
      createdTemplateId = data.id;
    });

    it('should update and then delete custom template (200)', async () => {
      const patchRes = await request(app)
        .patch(`/api/v1/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed Enterprise Demo Follow-up' });

      assert.strictEqual(patchRes.status, 200);

      const delRes = await request(app)
        .delete(`/api/v1/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(delRes.status, 200);
    });
  });

  describe('3. Free ATS Score Check Lead Capture & Duplicate Prevention', () => {
    const testEmail = `ats.candidate.${Date.now()}@samplefintech.com`;

    it('should capture new inbound lead with Free ATS Score Check and create Contact + Company (201)', async () => {
      const res = await request(app)
        .post('/api/v1/lead-capture/ats-score')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Vikram Malhotra',
          email: testEmail,
          phone: '+91 98765 43210',
          companyName: 'Fintech Nextwave Labs',
          jobTitle: 'Head of Talent Acquisition',
          atsScore: 84,
          resumeName: 'Senior_DevOps_Resume.pdf',
          notes: 'Candidate scored 84% on technical screening parser.',
        });

      assert.strictEqual(res.status, 201);
      const data = (res.body as {
        data: {
          lead: {
            id: string;
            title: string;
            source: string;
            ats_score: number;
            priority: string;
            company_name: string;
            contact_name: string;
          };
          isExistingContact: boolean;
        };
      }).data;

      assert.strictEqual(data.isExistingContact, false);
      assert.strictEqual(data.lead.source, 'Free ATS Score Check');
      assert.strictEqual(data.lead.ats_score, 84);
      assert.strictEqual(data.lead.priority, 'High');
      assert.strictEqual(data.lead.company_name, 'Fintech Nextwave Labs');
      assert.strictEqual(data.lead.contact_name, 'Vikram Malhotra');
    });

    it('should prevent duplicate contact creation when second lead submitted with same email (201)', async () => {
      const res = await request(app)
        .post('/api/v1/lead-capture/ats-score')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Vikram Malhotra',
          email: testEmail,
          companyName: 'Fintech Nextwave Labs',
          jobTitle: 'Head of Talent Acquisition',
          atsScore: 91,
          resumeName: 'Engineering_Lead_Resume.pdf',
          notes: 'Second submission for another requisition.',
        });

      assert.strictEqual(res.status, 201);
      const data = (res.body as {
        data: {
          isExistingContact: boolean;
          lead: { ats_score: number };
        };
      }).data;

      assert.strictEqual(data.isExistingContact, true, 'Should detect existing contact and reuse ID without duplicating');
      assert.strictEqual(data.lead.ats_score, 91);
    });
  });

  describe('4. Configurable Weekly Targets API', () => {
    it('should retrieve weekly targets with live actuals from database (200)', async () => {
      const res = await request(app)
        .get('/api/v1/targets/weekly')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const items = (res.body as {
        data: Array<{
          target_type: string;
          target_value: number;
          actual_value: number;
          achievement_rate: number;
          remaining: number;
        }>;
      }).data;

      assert.strictEqual(items.length, 5);
      const types = items.map((i) => i.target_type);
      assert.ok(types.includes('companies'));
      assert.ok(types.includes('contacts'));
      assert.ok(types.includes('outreach'));
      assert.ok(types.includes('replies'));
      assert.ok(types.includes('demos'));

      for (const item of items) {
        assert.strictEqual(typeof item.target_value, 'number');
        assert.strictEqual(typeof item.actual_value, 'number');
        assert.strictEqual(typeof item.achievement_rate, 'number');
        assert.strictEqual(typeof item.remaining, 'number');
      }
    });

    it('should configure/update weekly target value (200)', async () => {
      const res = await request(app)
        .post('/api/v1/targets/weekly')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetType: 'outreach',
          targetValue: 100,
        });

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { target_type: string; target_value: number } }).data;
      assert.strictEqual(data.target_type, 'outreach');
      assert.strictEqual(data.target_value, 100);
    });
  });

  describe('5. Real Database Reporting Overview API', () => {
    it('should compute live reporting overview metrics across all platform modules (200)', async () => {
      const res = await request(app)
        .get('/api/v1/reporting/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = (res.body as {
        data: {
          summary: {
            companiesAdded: number;
            contactsFound: number;
            leadsCreated: number;
            messagesSent: number;
            callsMade: number;
            totalOutreachTouches: number;
            replies: number;
            demosBooked: number;
            won: number;
            lost: number;
            conversionRate: number;
            overdueFollowUps: number;
          };
          leadsBySource: Array<{ source: string; count: number; percentage: number }>;
          leadsByCampaign: Array<{ campaignName: string; totalLeads: number }>;
          leadsByProduct: Array<{ product: string; count: number }>;
        };
      }).data;

      assert.ok(data.summary);
      assert.strictEqual(typeof data.summary.companiesAdded, 'number');
      assert.strictEqual(typeof data.summary.contactsFound, 'number');
      assert.strictEqual(typeof data.summary.leadsCreated, 'number');
      assert.strictEqual(typeof data.summary.messagesSent, 'number');
      assert.strictEqual(typeof data.summary.callsMade, 'number');
      assert.strictEqual(typeof data.summary.conversionRate, 'number');
      assert.strictEqual(typeof data.summary.overdueFollowUps, 'number');

      assert.ok(Array.isArray(data.leadsBySource));
      assert.ok(Array.isArray(data.leadsByCampaign));
      assert.ok(Array.isArray(data.leadsByProduct));
    });

    it('should support date-range filtering in reporting (200)', async () => {
      const res = await request(app)
        .get('/api/v1/reporting/overview?period=monthly')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { filters: { period: string } } }).data;
      assert.strictEqual(data.filters.period, 'monthly');
    });

    it('should support legacy performance report endpoint (200)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/performance?period=Monthly')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { summary: { totalLeads: number } } }).data;
      assert.ok(data.summary);
    });
  });
});
