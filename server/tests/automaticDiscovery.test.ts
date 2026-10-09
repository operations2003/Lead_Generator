/// <reference path="../types/sqlite.d.ts" />
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../app';
import { getDb } from '../db/database';
import { initDb } from '../db/migrate';
import { validateUrlForSsrf, isPrivateIp, safeFetch } from '../utils/ssrfProtection';
import { companyDiscoveryEngine } from '../services/companyDiscoveryEngine';
import { websiteEnrichmentEngine } from '../services/websiteEnrichmentEngine';
import { autoDiscoveryService } from '../services/autoDiscoveryService';

const app = createApp();

describe('Automatic Lead Discovery & Website Enrichment Workflow Test Suite', () => {
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

  describe('1. SSRF Protection & Security Hardening', () => {
    it('should correctly classify private and loopback IPv4 and IPv6 addresses', () => {
      assert.equal(isPrivateIp('127.0.0.1'), true);
      assert.equal(isPrivateIp('10.0.0.1'), true);
      assert.equal(isPrivateIp('172.16.0.5'), true);
      assert.equal(isPrivateIp('192.168.1.100'), true);
      assert.equal(isPrivateIp('169.254.169.254'), true); // AWS metadata
      assert.equal(isPrivateIp('0.0.0.0'), true);
      assert.equal(isPrivateIp('::1'), true);
      assert.equal(isPrivateIp('8.8.8.8'), false);
      assert.equal(isPrivateIp('1.1.1.1'), false);
    });

    it('should reject local hostnames, loopbacks, and metadata IPs with validateUrlForSsrf', async () => {
      await assert.rejects(
        () => validateUrlForSsrf('http://localhost:5000/api/v1/secret'),
        /SSRF blocked|Prohibited host/
      );

      await assert.rejects(
        () => validateUrlForSsrf('http://127.0.0.1:8080/admin'),
        /SSRF blocked/
      );

      await assert.rejects(
        () => validateUrlForSsrf('http://169.254.169.254/latest/meta-data'),
        /SSRF blocked/
      );

      await assert.rejects(
        () => validateUrlForSsrf('ftp://malicious.com/file'),
        /Unsupported or prohibited protocol/
      );

      await assert.rejects(
        () => validateUrlForSsrf('file:///etc/passwd'),
        /Unsupported or prohibited protocol/
      );
    });

    it('should allow valid public HTTP/HTTPS URLs', async () => {
      const parsed = await validateUrlForSsrf('https://example.com');
      assert.equal(parsed.protocol, 'https:');
      assert.equal(parsed.hostname, 'example.com');
    });

    it('should fail gracefully and record error when attempting to fetch an unavailable website', async () => {
      await assert.rejects(
        () => safeFetch('https://this-domain-definitely-does-not-exist-2026-xyz.org', { timeoutMs: 3000 }),
        /DNS resolution failed|ENOTFOUND|getaddrinfo/
      );
    });
  });

  describe('2. Stage A: Company Discovery Engine', () => {
    it('should discover legitimate companies given category and location without requiring names or URLs', async () => {
      const candidates = await companyDiscoveryEngine.discoverCompanies({
        category: 'Dentist Clinic',
        location: 'Austin',
        maxResults: 2,
      });

      assert.ok(Array.isArray(candidates));
      assert.ok(candidates.length > 0);
      const first = candidates[0];
      assert.ok(first.name);
      assert.ok(first.website);
      assert.ok(first.domain);
      assert.equal(first.category, 'Dentist Clinic');
      assert.equal(first.location, 'Austin');
      assert.ok(first.source);
    });

    it('should deduplicate candidates by domain and normalize names', async () => {
      const candidates = await companyDiscoveryEngine.discoverCompanies({
        category: 'Hospital',
        location: 'Austin',
        maxResults: 5,
      });

      const domains = candidates.map((c) => c.domain);
      const uniqueDomains = new Set(domains);
      assert.equal(domains.length, uniqueDomains.size);
    });
  });

  describe('3. Stage B: Website Contact Enrichment Engine', () => {
    it('should enrich discovered company and extract public contacts, distinguishing verified from found', async () => {
      const mockCandidate = {
        name: 'Dentist in Austin',
        normalizedName: 'dentistinaustin',
        category: 'Dentistry',
        location: 'Austin, TX',
        website: 'https://dentistinaustintx.com',
        domain: 'dentistinaustintx.com',
        source: 'Registry',
      };

      const enriched = await websiteEnrichmentEngine.enrichSingleCompany(mockCandidate);

      assert.equal(enriched.companyName, 'Dentist in Austin');
      assert.ok(enriched.extractionStatus === 'completed' || enriched.extractionStatus === 'no_contacts');
      assert.ok(Array.isArray(enriched.emails));
      assert.ok(Array.isArray(enriched.phones));
      assert.ok(Array.isArray(enriched.sourceUrls));

      // Each extracted contact must preserve sourceUrl
      for (const email of enriched.emails) {
        assert.ok(email.email);
        assert.ok(email.sourceUrl);
        assert.ok(['found', 'syntax_valid', 'verified'].includes(email.status));
      }

      for (const phone of enriched.phones) {
        assert.ok(phone.phone);
        assert.ok(phone.sourceUrl);
        assert.ok(['found', 'syntax_valid', 'verified'].includes(phone.status));
      }
    });

    it('should mark unreachable websites as website_unavailable and never report false success', async () => {
      const mockDeadCandidate = {
        name: 'Dead Company',
        normalizedName: 'deadcompany',
        category: 'Consulting',
        location: 'London',
        website: 'https://this-does-not-exist-at-all-897123.com',
        domain: 'this-does-not-exist-at-all-897123.com',
        source: 'Test',
      };

      const enriched = await websiteEnrichmentEngine.enrichSingleCompany(mockDeadCandidate);
      assert.equal(enriched.extractionStatus, 'website_unavailable');
      assert.ok(enriched.extractionError);
      assert.equal(enriched.emails.length, 0);
      assert.equal(enriched.phones.length, 0);
    });
  });

  describe('4. Automatic Discovery Endpoints & End-to-End Workflow', () => {
    let createdJobId: string;
    let discoveredLeadIds: string[] = [];

    it('should reject requests with missing category or location (400)', async () => {
      const res = await request(app)
        .post('/api/v1/discovery/auto-discover')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category: '' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'MISSING_CATEGORY');
    });

    it('should execute auto-discovery workflow end-to-end and persist job and leads in database', async () => {
      const res = await request(app)
        .post('/api/v1/discovery/auto-discover')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'Dentist',
          location: 'Austin',
          maxResults: 2,
          autoSave: false,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.job);
      assert.ok(res.body.data.job.id);
      assert.equal(res.body.data.job.category, 'Dentist');
      assert.equal(res.body.data.job.location, 'Austin');
      assert.ok(Array.isArray(res.body.data.leads));
      assert.ok(res.body.data.leads.length > 0);

      createdJobId = res.body.data.job.id;
      discoveredLeadIds = res.body.data.leads.map((l: { id: string }) => l.id);

      const firstLead = res.body.data.leads[0];
      assert.ok(firstLead.company_name);
      assert.ok(firstLead.website);
      assert.ok(firstLead.domain);
      assert.ok(firstLead.extraction_status);
    });

    it('should list discovery jobs via GET /api/v1/discovery/jobs', async () => {
      const res = await request(app)
        .get('/api/v1/discovery/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((j: { id: string }) => j.id === createdJobId));
    });

    it('should retrieve job details and filtered leads via GET /api/v1/discovery/jobs/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/discovery/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.job.id, createdJobId);
      assert.ok(Array.isArray(res.body.data.leads));
    });

    it('should save discovered leads into permanent CRM database via POST /api/v1/discovery/jobs/:id/save-crm', async () => {
      assert.ok(discoveredLeadIds.length > 0);

      const res = await request(app)
        .post(`/api/v1/discovery/jobs/${createdJobId}/save-crm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadIds: [discoveredLeadIds[0]],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.savedCount, 1);

      // Verify row in companies, contacts, and leads
      const leadRow = db
        .prepare('SELECT id, saved_to_crm, saved_company_id, saved_lead_id FROM discovered_leads WHERE id = ?')
        .get(discoveredLeadIds[0]) as { saved_to_crm: number; saved_company_id: string; saved_lead_id: string };

      assert.equal(leadRow.saved_to_crm, 1);
      assert.ok(leadRow.saved_company_id);
      assert.ok(leadRow.saved_lead_id);

      const crmLead = db.prepare('SELECT id, title, source FROM leads WHERE id = ?').get(leadRow.saved_lead_id) as { source: string };
      assert.ok(crmLead);
      assert.equal(crmLead.source, 'Automatic Lead Discovery');
    });

    it('should export discovered leads to formatted CSV via GET /api/v1/discovery/jobs/:id/export-csv', async () => {
      const res = await request(app)
        .get(`/api/v1/discovery/jobs/${createdJobId}/export-csv`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.header['content-type'].includes('text/csv'));
      assert.ok(res.text.includes('Company Name'));
      assert.ok(res.text.includes('Official Website'));
      assert.ok(res.text.includes('Email Addresses'));
      assert.ok(res.text.includes('Phone Numbers'));
      assert.ok(res.text.includes('Source URLs'));
    });

    after(() => {
      if (createdJobId) {
        const savedLeads = db
          .prepare('SELECT saved_company_id, saved_lead_id FROM discovered_leads WHERE job_id = ?')
          .all() as Array<{ saved_company_id: string; saved_lead_id: string }>;
        for (const row of savedLeads) {
          if (row.saved_lead_id) {
            db.prepare('DELETE FROM leads WHERE id = ?').run(row.saved_lead_id);
          }
        }
        db.prepare('DELETE FROM discovered_leads WHERE job_id = ?').run(createdJobId);
        db.prepare('DELETE FROM discovery_jobs WHERE id = ?').run(createdJobId);
      }
    });
  });
});
