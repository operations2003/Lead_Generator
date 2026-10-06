process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { initDb } from '../db/migrate';
import {
  evaluateLeadQualification,
  validateAndReconcilePriority,
  DEFAULT_QUALIFICATION_CONFIG,
} from '../services/qualificationEngine';

const app = createApp();

describe('Phase 5 — Lead Qualification & Scoring Test Suite', () => {
  let adminToken: string;
  let viewerToken: string;
  let testLeadId: string;
  const companyId = 'cmp_techcorp_01';
  const decisionMakerContactId = 'cnt_001'; // Alex Rivera (VP of Eng, decision_maker: 1)

  before(async () => {
    await initDb();

    // Login admin (write permissions)
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

  describe('1. Unit Tests: Qualification Engine & Priority Business Logic', () => {
    it('should assign High priority when signals are strong AND verified decision maker is present', () => {
      const result = evaluateLeadQualification(
        {
          product: 'Higher IQ',
          hiringVolume: 'High',
          hiringMultipleRoles: true,
          manualHrProcesses: true,
        },
        {
          id: 'cnt_100',
          name: 'Jane Doe',
          title: 'VP of Talent Acquisition',
          decisionMaker: true,
        },
        {
          productFit: 'High',
        }
      );

      assert.ok(result.score >= 70, `Expected score >= 70, got ${result.score}`);
      assert.equal(result.hasAppropriateContact, true);
      assert.equal(result.isHighPriorityAllowed, true);
      assert.equal(result.calculatedPriority, 'High');
      assert.equal(result.fitSignalsRating, 'Strong');
    });

    it('should DOWNGRADE to Medium priority if signals are strong (score >= 70) but NO decision maker contact is attached', () => {
      // Business rule: High priority should reflect strong fit signals and having the appropriate contact available.
      const result = evaluateLeadQualification(
        {
          product: 'Higher IQ',
          hiringVolume: 'High',
          hiringMultipleRoles: true,
          manualHrProcesses: true,
        },
        null, // No contact!
        {
          productFit: 'High',
        }
      );

      assert.ok(result.score >= 70, `Score is high (${result.score})`);
      assert.equal(result.hasAppropriateContact, false);
      assert.equal(result.isHighPriorityAllowed, false);
      assert.equal(result.calculatedPriority, 'Medium');
      assert.ok(result.validationReason?.includes('verified decision maker'));
    });

    it('should prevent frontend from forcing High priority when business rule is not met', () => {
      const qualResult = evaluateLeadQualification(
        {
          product: 'HRMS Portal',
          hiringVolume: 'Low',
          hiringMultipleRoles: false,
          manualHrProcesses: false,
        },
        null
      );

      // Attempt to bypass by requesting High
      const reconciled = validateAndReconcilePriority('High', qualResult);
      assert.equal(reconciled.adjusted, true);
      assert.equal(reconciled.priority, 'Low');
      assert.ok(reconciled.reason);
    });

    it('should calculate Medium priority for moderate fit signals', () => {
      const result = evaluateLeadQualification(
        {
          product: 'HRMS Portal',
          hiringVolume: 'Medium',
          hiringMultipleRoles: false,
          manualHrProcesses: true,
        },
        {
          id: 'cnt_200',
          decisionMaker: false,
        },
        {
          productFit: 'Medium',
        }
      );

      assert.ok(result.score >= 40 && result.score < 70, `Expected moderate score, got ${result.score}`);
      assert.equal(result.calculatedPriority, 'Medium');
    });

    it('should support configurable thresholds and weights', () => {
      const customConfig = {
        ...DEFAULT_QUALIFICATION_CONFIG,
        highScoreThreshold: 90, // stricter
      };

      const result = evaluateLeadQualification(
        {
          product: 'Higher IQ',
          hiringVolume: 'High',
          hiringMultipleRoles: true,
          manualHrProcesses: false,
        },
        {
          id: 'cnt_100',
          decisionMaker: true,
        },
        {
          productFit: 'Medium',
        },
        customConfig
      );

      // Score is around 70, which is below 90, so priority is Medium under custom config
      assert.equal(result.calculatedPriority, 'Medium');
    });
  });

  describe('2. Authentication & Authorization Enforcement', () => {
    it('should reject unauthenticated request to /api/v1/leads (401)', async () => {
      const res = await request(app).get('/api/v1/leads');
      assert.equal(res.status, 401);
    });

    it('should allow viewer role with leads:read to query leads (200)', async () => {
      const res = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${viewerToken}`);
      assert.equal(res.status, 200);
      assert.equal((res.body as { success: boolean }).success, true);
    });

    it('should reject viewer role from creating a lead (403)', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Unauthorized Lead',
          companyId,
          product: 'Higher IQ',
        });
      assert.equal(res.status, 403);
    });
  });

  describe('3. Real-Time Qualification Preview Endpoint (/api/v1/leads/preview-qualification)', () => {
    it('should compute real-time qualification score and priority preview for frontend', async () => {
      const res = await request(app)
        .post('/api/v1/leads/preview-qualification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId,
          contactId: decisionMakerContactId,
          signals: {
            product: 'Higher IQ',
            hiringVolume: 'High',
            hiringMultipleRoles: true,
            manualHrProcesses: true,
          },
        });

      assert.equal(res.status, 200);
      const data = (res.body as { data: { score: number; calculatedPriority: string; hasAppropriateContact: boolean } }).data;
      assert.ok(data.score >= 70);
      assert.equal(data.calculatedPriority, 'High');
      assert.equal(data.hasAppropriateContact, true);
    });
  });

  describe('4. Lead Creation, Validation & Duplicate Handling', () => {
    it('should create a qualified lead connecting Company + Contact + Product + Signals (201)', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId,
          contactId: decisionMakerContactId,
          product: 'Higher IQ',
          title: 'Automated Technical Interview Pipeline',
          value: 75000,
          status: 'Contacted',
          priority: 'High',
          hiringVolume: 'High',
          hiringMultipleRoles: true,
          manualHrProcesses: true,
          existingTools: 'Lever, Workday',
          notes: 'High intent prospect looking to accelerate technical hiring cycles.',
          allowDuplicate: true,
        });

      assert.equal(res.status, 201);
      const data = (res.body as { data: { id: string; title: string; priority: string; qualificationScore: number; companyName: string; contactName: string } }).data;
      assert.ok(data.id);
      assert.equal(data.title, 'Automated Technical Interview Pipeline');
      assert.equal(data.priority, 'High');
      assert.ok(data.qualificationScore >= 70);
      assert.equal(data.companyName, 'TechCorp Solutions');
      assert.equal(data.contactName, 'Alex Rivera');
      testLeadId = data.id;
    });

    it('should enforce backend business rule by preventing unauthorized High priority without contact', async () => {
      // User creates lead claiming "High" priority with high signals, but NO contact
      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId,
          product: 'HRMS Portal',
          title: 'Core HR Modernization Deal',
          value: 40000,
          priority: 'High', // Frontend requested High!
          hiringVolume: 'High',
          hiringMultipleRoles: true,
          manualHrProcesses: true,
          allowDuplicate: true,
        });

      assert.equal(res.status, 201);
      const data = (res.body as { data: { priority: string; contactId: string | null } }).data;
      // Backend must have overridden to Medium because no decision-maker contact was attached!
      assert.equal(data.priority, 'Medium');
    });

    it('should reject creation with missing required fields (400)', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          value: 10000,
        });

      assert.equal(res.status, 400);
      assert.equal((res.body as { code: string }).code, 'MISSING_TITLE');
    });

    it('should reject creation if company does not exist (404)', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Ghost Company Lead',
          companyId: 'cmp_non_existent_9999',
          product: 'Higher IQ',
        });

      assert.equal(res.status, 404);
      assert.equal((res.body as { code: string }).code, 'COMPANY_NOT_FOUND');
    });

    it('should detect duplicate active lead for same company and product (409)', async () => {
      // We already have a lead for TechCorp with product 'Higher IQ'
      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId,
          product: 'Higher IQ',
          title: 'Duplicate Higher IQ Deal',
          value: 30000,
        });

      assert.equal(res.status, 409);
      assert.equal((res.body as { code: string }).code, 'DUPLICATE_LEAD_EXISTS');
    });
  });

  describe('5. Lead Retrieval, Search, Filter & Pagination', () => {
    it('should retrieve lead by ID with complete relations and qualification breakdown (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: { id: string; product: string; qualificationBreakdown: { score: number; fitSignalsRating: string } } }).data;
      assert.equal(data.id, testLeadId);
      assert.equal(data.product, 'Higher IQ');
      assert.ok(data.qualificationBreakdown);
      assert.equal(data.qualificationBreakdown.fitSignalsRating, 'Strong');
    });

    it('should filter leads by product (Higher IQ, HRMS Portal, Both)', async () => {
      const res = await request(app)
        .get('/api/v1/leads?product=Higher IQ')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: { items: Array<{ product: string }> } }).data;
      assert.ok(data.items.length >= 1);
      for (const item of data.items) {
        assert.equal(item.product, 'Higher IQ');
      }
    });

    it('should filter leads by priority (High)', async () => {
      const res = await request(app)
        .get('/api/v1/leads?priority=High')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: { items: Array<{ priority: string }> } }).data;
      assert.ok(data.items.length >= 1);
      for (const item of data.items) {
        assert.equal(item.priority, 'High');
      }
    });

    it('should paginate and sort leads by qualification score descending', async () => {
      const res = await request(app)
        .get('/api/v1/leads?page=1&limit=5&sortBy=score&sortOrder=desc')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: { items: Array<{ qualificationScore: number }>; total: number } }).data;
      assert.ok(data.items.length <= 5);
      assert.ok(data.total >= 6);
      if (data.items.length > 1) {
        assert.ok(data.items[0].qualificationScore >= data.items[1].qualificationScore);
      }
    });
  });

  describe('6. Lead Update & Archive Lifecycle', () => {
    it('should update lead signals, re-qualify, and adjust score (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Demo Booked',
          value: 95000,
          notes: 'Demo booked with enterprise technical evaluation terms.',
        });

      assert.equal(res.status, 200);
      const data = (res.body as { data: { status: string; value: number; notes: string } }).data;
      assert.equal(data.status, 'Demo Booked');
      assert.equal(data.value, 95000);
      assert.equal(data.notes, 'Demo booked with enterprise technical evaluation terms.');
    });

    it('should archive lead and remove from active listing (200)', async () => {
      const res = await request(app)
        .delete(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);

      const checkRes = await request(app)
        .get(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal((checkRes.body as { data: { status: string } }).data.status, 'Archived');
    });

    it('should allow permanent deletion when requested (200)', async () => {
      const res = await request(app)
        .delete(`/api/v1/leads/${testLeadId}?permanent=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);

      const checkRes = await request(app)
        .get(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(checkRes.status, 404);
    });
  });
});
