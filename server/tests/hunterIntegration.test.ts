process.env.NODE_ENV = 'test';

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { getDb } from '../db/database';
import { initDb } from '../db/migrate';
import { HunterService, hunterService, HunterProspectLead } from '../services/hunterService';

const app = createApp();

describe('Hunter.io API v2 Integration Test Suite', () => {
  let adminToken: string;
  let originalFetch: typeof global.fetch;

  before(async () => {
    await initDb();

    // Authenticate admin user
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leadgen.com', password: 'Admin@12345' });
    adminToken = loginRes.body.data.token;

    originalFetch = global.fetch;
    hunterService.setApiKey('test_mock_hunter_api_key_valid');
  });

  after(() => {
    global.fetch = originalFetch;
    hunterService.setApiKey('');
  });

  describe('1. Configuration & Security Hardening', () => {
    it('should report not configured when API key is empty', async () => {
      const service = new HunterService(getDb(), '');
      assert.equal(service.isConfigured(), false);

      await assert.rejects(
        async () => {
          await service.getAccountInfo();
        },
        {
          code: 'HUNTER_NOT_CONFIGURED',
        }
      );
    });

    it('should report configured true when key is present', () => {
      const service = new HunterService(getDb(), 'test_dummy_hunter_key_12345');
      assert.equal(service.isConfigured(), true);
    });

    it('should return 200 with configured status via GET /api/v1/hunter/status', async () => {
      const res = await request(app)
        .get('/api/v1/hunter/status')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok('configured' in res.body.data);
    });

    it('should require authentication for all Hunter endpoints (401)', async () => {
      const res = await request(app).get('/api/v1/hunter/status');
      assert.equal(res.status, 401);
    });
  });

  describe('2. Account Status & Credit Tracking', () => {
    beforeEach(() => {
      global.fetch = async (url: RequestInfo | URL) => {
        const urlStr = url.toString();
        if (urlStr.includes('/account')) {
          return new Response(
            JSON.stringify({
              data: {
                first_name: 'Test',
                last_name: 'Hunter',
                email: 'user@example.com',
                plan_name: 'Starter',
                plan_level: 1,
                reset_date: '2026-11-01',
                requests: {
                  searches: { used: 12, available: 500 },
                  verifications: { used: 5, available: 1000 },
                },
                calls: { used: 17, available: 5000 },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 404 });
      };
    });

    it('should fetch and parse account plan and search/verification credits accurately', async () => {
      const service = new HunterService(getDb(), 'valid_test_hunter_key');
      const account = await service.getAccountInfo();

      assert.equal(account.plan_name, 'Starter');
      assert.equal(account.email, 'user@example.com');
      assert.equal(account.requests.searches.used, 12);
      assert.equal(account.requests.searches.available, 500);
      assert.equal(account.requests.verifications.available, 1000);
    });
  });

  describe('3. POST /v2/discover — Company Discovery', () => {
    beforeEach(() => {
      global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = url.toString();
        if (urlStr.includes('/discover')) {
          const body = JSON.parse(init?.body as string);
          assert.ok(body.limit, 'Should send limit');

          return new Response(
            JSON.stringify({
              data: [
                {
                  domain: 'stripe.com',
                  organization: 'Stripe',
                  country: 'US',
                  region: 'California',
                  city: 'San Francisco',
                  industry: 'Financial Services',
                  description: 'Financial infrastructure for the internet',
                  headcount: '5001-10000',
                  emails_count: {
                    personal: 450,
                    generic: 120,
                    total: 570,
                  },
                },
                {
                  domain: 'plaid.com',
                  organization: 'Plaid',
                  country: 'US',
                  city: 'San Francisco',
                  industry: 'Financial Services',
                  description: 'The easiest way for users to connect their bank accounts to an app',
                  headcount: '1001-5000',
                  emails_count: {
                    personal: 210,
                    generic: 45,
                    total: 255,
                  },
                },
              ],
              meta: { results: 2, limit: 10, offset: 0 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 404 });
      };
    });

    it('should discover matching companies with email counts and metadata', async () => {
      const service = new HunterService(getDb(), 'valid_test_hunter_key');
      const res = await service.discoverCompanies({
        industry: 'Financial Services',
        location: 'San Francisco',
        limit: 10,
      });

      assert.equal(res.companies.length, 2);
      assert.equal(res.companies[0].organization, 'Stripe');
      assert.equal(res.companies[0].domain, 'stripe.com');
      assert.equal(res.companies[0].emails_count.total, 570);
      assert.equal(res.companies[1].organization, 'Plaid');
    });

    it('should expose POST /api/v1/hunter/discover endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/hunter/discover')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ industry: 'Financial Services', location: 'San Francisco', limit: 5 });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.companies.length, 2);
    });
  });

  describe('4. GET /v2/domain-search — Professional Emails & Confidence', () => {
    beforeEach(() => {
      global.fetch = async (url: RequestInfo | URL) => {
        const urlStr = url.toString();
        if (urlStr.includes('/domain-search')) {
          return new Response(
            JSON.stringify({
              data: {
                domain: 'stripe.com',
                organization: 'Stripe',
                pattern: '{first}',
                emails: [
                  {
                    value: 'patrick@stripe.com',
                    type: 'personal',
                    confidence: 98,
                    first_name: 'Patrick',
                    last_name: 'Collison',
                    position: 'Chief Executive Officer',
                    department: 'executive',
                    phone_number: '+1 415-555-0100',
                    linkedin: 'https://linkedin.com/in/patrickcollison',
                    sources: [
                      {
                        domain: 'techcrunch.com',
                        uri: 'https://techcrunch.com/article-patrick',
                        extracted_on: '2025-01-15',
                        still_on_page: true,
                      },
                    ],
                  },
                  {
                    value: 'press@stripe.com',
                    type: 'generic',
                    confidence: 85,
                    first_name: null,
                    last_name: null,
                    position: 'Media Relations',
                    department: 'communication',
                    sources: [],
                  },
                ],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 404 });
      };
    });

    it('should retrieve domain emails with type, confidence, and source URLs', async () => {
      const service = new HunterService(getDb(), 'valid_test_hunter_key');
      const data = await service.domainSearch('stripe.com');

      assert.equal(data.domain, 'stripe.com');
      assert.equal(data.emails.length, 2);

      const personal = data.emails[0];
      assert.equal(personal.value, 'patrick@stripe.com');
      assert.equal(personal.type, 'personal');
      assert.equal(personal.confidence, 98);
      assert.equal(personal.position, 'Chief Executive Officer');
      assert.equal(personal.sources.length, 1);
      assert.equal(personal.sources[0].domain, 'techcrunch.com');
    });

    it('should reject missing domain parameter with 400 on GET /api/v1/hunter/domain-search', async () => {
      const res = await request(app)
        .get('/api/v1/hunter/domain-search')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'MISSING_DOMAIN');
    });

    it('should succeed with valid domain on GET /api/v1/hunter/domain-search', async () => {
      const res = await request(app)
        .get('/api/v1/hunter/domain-search?domain=stripe.com')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.domain, 'stripe.com');
    });
  });

  describe('5. GET /v2/email-finder & GET /v2/email-verifier', () => {
    beforeEach(() => {
      global.fetch = async (url: RequestInfo | URL) => {
        const urlStr = url.toString();
        if (urlStr.includes('/email-finder')) {
          return new Response(
            JSON.stringify({
              data: {
                first_name: 'Alexis',
                last_name: 'Ohanian',
                email: 'alexis@reddit.com',
                score: 95,
                domain: 'reddit.com',
                position: 'Co-Founder',
                sources: [{ uri: 'https://reddit.com/about' }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('/email-verifier')) {
          return new Response(
            JSON.stringify({
              data: {
                email: 'alexis@reddit.com',
                status: 'valid',
                result: 'deliverable',
                score: 98,
                regexp: true,
                gibberish: false,
                disposable: false,
                webmail: false,
                mx_records: true,
                smtp_server: true,
                smtp_check: true,
                accept_all: false,
                sources: [],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 404 });
      };
    });

    it('should find specific contact email using Hunter Email Finder API', async () => {
      const service = new HunterService(getDb(), 'valid_test_hunter_key');
      const res = await service.findEmail({
        domain: 'reddit.com',
        firstName: 'Alexis',
        lastName: 'Ohanian',
      });

      assert.equal(res.email, 'alexis@reddit.com');
      assert.equal(res.score, 95);
      assert.equal(res.position, 'Co-Founder');
    });

    it('should verify email deliverability on-demand using Hunter Email Verifier API', async () => {
      const service = new HunterService(getDb(), 'valid_test_hunter_key');
      const res = await service.verifyEmail('alexis@reddit.com');

      assert.equal(res.status, 'valid');
      assert.equal(res.result, 'deliverable');
      assert.equal(res.score, 98);
      assert.equal(res.smtp_check, true);
    });

    it('should reject invalid or missing email in verify endpoint (400)', async () => {
      const res = await request(app)
        .post('/api/v1/hunter/verify-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'notanemail' });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_EMAIL');
    });
  });

  describe('6. Plan Limitation & Error Mapping', () => {
    it('should accurately detect and explain 403 upgrade_required for Discover endpoint', async () => {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            errors: [
              {
                id: 'upgrade_required',
                code: 403,
                details: 'Your plan does not allow using the Discover endpoint.',
              },
            ],
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const service = new HunterService(getDb(), 'free_tier_hunter_key');
      await assert.rejects(
        async () => {
          await service.discoverCompanies({ industry: 'Fintech' });
        },
        (err: unknown) => {
          const e = err as { code: string; message: string; status: number };
          assert.equal(e.code, 'HUNTER_PLAN_UPGRADE_REQUIRED');
          assert.equal(e.status, 403);
          assert.ok(e.message.includes('Discover requires a Hunter Data Platform or Enterprise plan'));
          return true;
        }
      );
    });

    it('should accurately handle 401 Authentication Failure', async () => {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            errors: [
              {
                id: 'authentication_failed',
                code: 401,
                details: 'No authentication could be found',
              },
            ],
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const service = new HunterService(getDb(), 'invalid_key');
      await assert.rejects(
        async () => {
          await service.domainSearch('github.com');
        },
        {
          code: 'HUNTER_AUTH_FAILED',
          status: 401,
        }
      );
    });

    it('should accurately handle 429 Rate Limit Reached', async () => {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            errors: [
              {
                id: 'too_many_requests',
                code: 429,
                details: 'Too many requests',
              },
            ],
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const service = new HunterService(getDb(), 'rate_limited_key');
      await assert.rejects(
        async () => {
          await service.verifyEmail('test@company.com');
        },
        {
          code: 'HUNTER_RATE_LIMIT',
          status: 429,
        }
      );
    });
  });

  describe('7. CRM Database Saving, Duplicate Detection & CSV Export', () => {
    before(() => {
      const db = getDb();
      db.prepare("DELETE FROM companies WHERE normalized_domain = 'acmepayments.io'").run();
      db.prepare("DELETE FROM contacts WHERE email LIKE '%@acmepayments.io'").run();
      db.prepare("DELETE FROM leads WHERE title LIKE 'Acme Payments Inc%'").run();
    });

    const testProspects: HunterProspectLead[] = [
      {
        id: 'hunt_test_01',
        domain: 'acmepayments.io',
        organization: 'Acme Payments Inc',
        industry: 'FinTech',
        location: 'New York, NY',
        headcount: '51-200',
        description: 'Global cross-border digital payments platform',
        emailsCount: { personal: 1, generic: 1, total: 2 },
        emails: [
          {
            value: 'claire@acmepayments.io',
            type: 'personal',
            confidence: 96,
            first_name: 'Claire',
            last_name: 'Davenport',
            position: 'Head of People & Talent',
            department: 'human_resources',
            seniority: 'director',
            linkedin: 'https://linkedin.com/in/clairedavenport',
            twitter: null,
            phone_number: '+1 212-555-0199',
            sources: [{ domain: 'acmepayments.io', uri: 'https://acmepayments.io/team', extracted_on: '2026-02-01', still_on_page: true }],
          },
          {
            value: 'hello@acmepayments.io',
            type: 'generic',
            confidence: 90,
            first_name: null,
            last_name: null,
            position: 'Inquiries',
            department: null,
            seniority: null,
            linkedin: null,
            twitter: null,
            phone_number: null,
            sources: [],
          },
        ],
        inCrm: false,
      },
    ];

    it('should save newly discovered Hunter prospects to Core CRM database (companies, contacts, leads)', async () => {
      const service = new HunterService(getDb(), 'valid_test_hunter_key');
      const saveRes = await service.saveProspectsToCrm(testProspects);

      assert.equal(saveRes.savedCompanies, 1);
      assert.equal(saveRes.savedContacts, 2);
      assert.equal(saveRes.savedLeads, 1);
      assert.equal(saveRes.errors.length, 0);

      // Verify records exist in SQLite tables
      const db = getDb();
      const company = db
        .prepare("SELECT * FROM companies WHERE normalized_domain = 'acmepayments.io'")
        .get() as { name: string; industry: string } | undefined;

      assert.ok(company);
      assert.equal(company?.name, 'Acme Payments Inc');
      assert.equal(company?.industry, 'FinTech');

      const contact = db
        .prepare("SELECT * FROM contacts WHERE email = 'claire@acmepayments.io'")
        .get() as { name: string; title: string } | undefined;

      assert.ok(contact);
      assert.equal(contact?.name, 'Claire Davenport');
      assert.equal(contact?.title, 'Head of People & Talent');

      const lead = db
        .prepare("SELECT * FROM leads WHERE title LIKE 'Acme Payments Inc%'")
        .get() as { source: string } | undefined;

      assert.ok(lead);
      assert.equal(lead?.source, 'Hunter.io');
    });

    it('should detect duplicates and skip re-inserting existing accounts', async () => {
      const service = new HunterService(getDb(), 'valid_test_hunter_key');
      const saveRes = await service.saveProspectsToCrm(testProspects);

      // Should skip inserting duplicate company
      assert.equal(saveRes.savedCompanies, 0);
      assert.equal(saveRes.skippedDuplicates, 1);
    });

    it('should format RFC 4180 CSV export with correct columns, scores, and sources', () => {
      const service = new HunterService(getDb(), 'valid_test_hunter_key');
      const csv = service.exportCsv(testProspects);

      assert.ok(csv.includes('Company Name,Domain,Industry,Location,Headcount'));
      assert.ok(csv.includes('"Acme Payments Inc"'));
      assert.ok(csv.includes('"acmepayments.io"'));
      assert.ok(csv.includes('"Claire Davenport"'));
      assert.ok(csv.includes('"claire@acmepayments.io"'));
      assert.ok(csv.includes('"96%"'));
      assert.ok(csv.includes('https://acmepayments.io/team'));
    });

    it('should expose CSV export via POST /api/v1/hunter/export-csv endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/hunter/export-csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ prospects: testProspects });

      assert.equal(res.status, 200);
      assert.ok(res.header['content-type'].includes('text/csv'));
      assert.ok(res.text.includes('claire@acmepayments.io'));
    });
  });
});
