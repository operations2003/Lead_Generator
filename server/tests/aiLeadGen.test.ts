import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../app';
import { getDb } from '../db/database';
import { initDb } from '../db/migrate';
import { aiLeadGenService } from '../services/aiLeadGenService';

const app = createApp();

describe('AI Lead Generation & OpenAI Integration Test Suite', () => {
  let db: DatabaseSync;
  let adminToken: string;

  before(async () => {
    await initDb();
    db = getDb();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leadgen.com', password: 'Admin@12345' });

    assert.equal(loginRes.status, 200);
    adminToken = (loginRes.body as { data: { token: string } }).data.token;
  });

  describe('1. AI Service Configuration & Status', () => {
    it('should report AI service active and configured with OpenAI API key', async () => {
      const res = await request(app).get('/api/v1/ai/status');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'active');
      assert.equal(res.body.data.isConfigured, true);
      assert.equal(res.body.data.model, 'gpt-4o-mini');
      assert.ok(aiLeadGenService.isConfigured());
    });

    it('should reject unauthenticated calls to AI lead generation endpoints (401)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/generate-leads')
        .send({ count: 1 });

      assert.equal(res.status, 401);
    });
  });

  describe('2. AI Lead Generation & Prospect Discovery', () => {
    it('should generate targeted B2B leads with companies, contacts, and qualification insights', async () => {
      const res = await request(app)
        .post('/api/v1/ai/generate-leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          industry: 'Cloud & DevOps Software',
          product: 'Higher IQ',
          location: 'San Francisco, CA',
          companySize: '201-500',
          count: 2,
          autoSave: false,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);

      const lead = res.body.data[0];
      assert.ok(lead.title);
      assert.ok(lead.value > 0);
      assert.ok(lead.qualificationScore >= 50);
      assert.ok(lead.company.name);
      assert.ok(lead.company.website);
      assert.ok(lead.contact.name);
      assert.ok(lead.contact.email);
    });

    it('should support autoSave=true to persist AI-generated lead directly into database', async () => {
      const res = await request(app)
        .post('/api/v1/ai/generate-leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          industry: 'FinTech & Banking',
          product: 'HRMS Portal',
          location: 'New York, NY',
          companySize: '100-250',
          count: 1,
          autoSave: true,
        });

      assert.equal(res.status, 200);
      const generated = res.body.data[0];
      assert.ok(generated.savedIds);
      assert.ok(generated.savedIds.companyId);
      assert.ok(generated.savedIds.contactId);
      assert.ok(generated.savedIds.leadId);

      // Verify row exists in leads table
      const leadRow = db.prepare('SELECT id, company_id, status FROM leads WHERE id = ?').get(generated.savedIds.leadId);
      assert.ok(leadRow);
    });
  });

  describe('3. AI Lead Qualification & Opportunity Analysis', () => {
    it('should generate an objective AI qualification evaluation for an existing lead', async () => {
      const res = await request(app)
        .post('/api/v1/ai/qualify-lead')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ leadId: 'ld_001' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.leadId, 'ld_001');
      assert.ok(res.body.data.qualificationScore >= 50);
      assert.ok(Array.isArray(res.body.data.keyPainPoints));
      assert.ok(res.body.data.recommendedNextStep);
    });
  });

  describe('4. AI Personalized Outreach & Multi-Channel Copywriting', () => {
    it('should generate personalized email outreach copy tailored to company and contact', async () => {
      const res = await request(app)
        .post('/api/v1/ai/outreach')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'CloudScale Systems',
          contactName: 'Naveen Kumar',
          contactTitle: 'VP of Engineering',
          product: 'Higher IQ',
          channel: 'Email',
          cadenceDay: 1,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.channel, 'Email');
      assert.ok(res.body.data.content.length > 50);
      assert.ok(res.body.data.content.includes('Naveen') || res.body.data.content.includes('CloudScale'));
    });

    it('should generate personalized LinkedIn InMail message', async () => {
      const res = await request(app)
        .post('/api/v1/ai/outreach')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadId: 'ld_001',
          channel: 'LinkedIn',
          cadenceDay: 3,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.channel, 'LinkedIn');
      assert.ok(res.body.data.content.length > 30);
    });
  });
});

