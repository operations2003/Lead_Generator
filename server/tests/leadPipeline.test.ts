process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { initDb } from '../db/migrate';
import {
  validateStageTransition,
  PIPELINE_STAGES,
} from '../services/leadPipelineEngine';
import { LeadStageType } from '../db/types';

const app = createApp();

describe('Phase 6 — Lead Pipeline & Stages Test Suite', () => {
  let adminToken: string;
  let viewerToken: string;
  let testLeadId: string;
  const companyId = 'cmp_techcorp_01';
  const contactId = 'cnt_006';

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

    // Create a fresh test lead starting at "New"
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companyId,
        contactId,
        product: 'Higher IQ',
        title: 'Pipeline Lifecycle Validation Opportunity',
        value: 120000,
        status: 'New',
        priority: 'High',
        hiringVolume: 'High',
        hiringMultipleRoles: true,
        manualHrProcesses: true,
        allowDuplicate: true,
      });

    testLeadId = (createRes.body as { data: { id: string } }).data.id;
  });

  describe('1. Unit Tests: Stage Validation & Transition Rules', () => {
    it('should allow valid sequential progression: New -> Contacted -> Replied -> Demo Booked -> Demo Done -> Won', () => {
      const step1 = validateStageTransition('New', 'Contacted');
      assert.equal(step1.isValid, true);

      const step2 = validateStageTransition('Contacted', 'Replied');
      assert.equal(step2.isValid, true);

      const step3 = validateStageTransition('Replied', 'Demo Booked');
      assert.equal(step3.isValid, true);

      const step4 = validateStageTransition('Demo Booked', 'Demo Done');
      assert.equal(step4.isValid, true);

      const step5 = validateStageTransition('Demo Done', 'Won');
      assert.equal(step5.isValid, true);
      assert.equal(step5.isWon, true);
    });

    it('should reject invalid stage skips (e.g. New directly to Won)', () => {
      const invalid = validateStageTransition('New', 'Won');
      assert.equal(invalid.isValid, false);
      assert.ok(invalid.reason?.includes('Invalid stage transition'));
    });

    it('should reject non-existent stages', () => {
      const invalid = validateStageTransition('New', 'Closed-Invalid' as LeadStageType);
      assert.equal(invalid.isValid, false);
      assert.ok(invalid.reason?.includes('not a recognized pipeline stage'));
    });

    it('should require a lost reason when transitioning to Lost', () => {
      const withoutReason = validateStageTransition('Demo Done', 'Lost', '');
      assert.equal(withoutReason.isValid, false);
      assert.equal(withoutReason.requiresLostReason, true);

      const withReason = validateStageTransition('Demo Done', 'Lost', 'Competitor Chosen');
      assert.equal(withReason.isValid, true);
      assert.equal(withReason.isLost, true);
    });
  });

  describe('2. Pipeline Grouping Endpoint (GET /api/v1/leads/pipeline)', () => {
    it('should return all pipeline stages with counts, totalValues, and leads', async () => {
      const res = await request(app)
        .get('/api/v1/leads/pipeline')
        .set('Authorization', `Bearer ${viewerToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: Array<{ stage: string; count: number; totalValue: number; leads: unknown[] }> }).data;
      assert.ok(Array.isArray(data));
      assert.equal(data.length, PIPELINE_STAGES.length);

      const stagesFound = data.map((d) => d.stage);
      for (const expectedStage of PIPELINE_STAGES) {
        assert.ok(stagesFound.includes(expectedStage), `Expected pipeline to include ${expectedStage}`);
      }
    });

    it('should filter pipeline by product (Higher IQ, HRMS Portal, Both)', async () => {
      const res = await request(app)
        .get('/api/v1/leads/pipeline?product=Higher IQ')
        .set('Authorization', `Bearer ${viewerToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: Array<{ leads: Array<{ product: string }> }> }).data;
      for (const group of data) {
        for (const lead of group.leads) {
          assert.equal(lead.product, 'Higher IQ');
        }
      }
    });
  });

  describe('3. Stage Change Interaction (PATCH /api/v1/leads/:id/stage)', () => {
    it('should reject unauthenticated stage update (401)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .send({ stage: 'Contacted' });
      assert.equal(res.status, 401);
    });

    it('should reject stage change from user without leads:write permission (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ stage: 'Contacted' });
      assert.equal(res.status, 403);
    });

    it('should reject invalid transition (e.g., New -> Won) with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'Won' });

      assert.equal(res.status, 400);
      assert.equal((res.body as { code: string }).code, 'INVALID_STAGE_TRANSITION');
    });

    it('should successfully transition New -> Contacted (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stage: 'Contacted',
          notes: 'Reached out to Alex Rivera via email and phone call.',
        });

      assert.equal(res.status, 200);
      const data = (res.body as { data: { status: string; stageChangedAt: string } }).data;
      assert.equal(data.status, 'Contacted');
      assert.ok(data.stageChangedAt);
    });

    it('should successfully transition Contacted -> Replied (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stage: 'Replied',
          notes: 'Client replied requesting product demo for their team.',
        });

      assert.equal(res.status, 200);
      const data = (res.body as { data: { status: string } }).data;
      assert.equal(data.status, 'Replied');
    });

    it('should successfully transition Replied -> Demo Booked (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stage: 'Demo Booked',
          notes: 'Demo scheduled on calendar for Thursday 2pm EST.',
        });

      assert.equal(res.status, 200);
      assert.equal((res.body as { data: { status: string } }).data.status, 'Demo Booked');
    });

    it('should successfully transition Demo Booked -> Demo Done (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stage: 'Demo Done',
          notes: 'Walked through Higher IQ automated assessments. Strong interest.',
        });

      assert.equal(res.status, 200);
      assert.equal((res.body as { data: { status: string } }).data.status, 'Demo Done');
    });

    it('should successfully transition Demo Done -> Won and set wonAt timestamp (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stage: 'Won',
          notes: 'MSA and order form signed. $120,000 closed deal.',
        });

      assert.equal(res.status, 200);
      const data = (res.body as { data: { status: string; wonAt: string } }).data;
      assert.equal(data.status, 'Won');
      assert.ok(data.wonAt, 'wonAt timestamp should be set');
    });

    it('should reject transition to Lost if lostReason is missing (400)', async () => {
      // Re-open won lead to Demo Done first
      await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'Demo Done' });

      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'Lost', lostReason: '' });

      assert.equal(res.status, 400);
      assert.ok((res.body as { message: string }).message.includes('lostReason is mandatory'));
    });

    it('should successfully transition to Lost with lostReason and set lostAt timestamp (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stage: 'Lost',
          lostReason: 'Budget Constraints / No Funds',
          notes: 'Customer froze budget for Q4 due to corporate reorganization.',
        });

      assert.equal(res.status, 200);
      const data = (res.body as { data: { status: string; lostAt: string; lostReason: string } }).data;
      assert.equal(data.status, 'Lost');
      assert.equal(data.lostReason, 'Budget Constraints / No Funds');
      assert.ok(data.lostAt);
    });
  });

  describe('4. Traceability & Stage History Persistence', () => {
    it('should maintain comprehensive stage change history for the lead', async () => {
      const res = await request(app)
        .get(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      assert.equal(res.status, 200);
      const data = (res.body as { data: { stageHistory: Array<{ fromStage: string; toStage: string; notes: string; lostReason: string }> } }).data;
      assert.ok(Array.isArray(data.stageHistory));
      assert.ok(data.stageHistory.length >= 6, `Expected at least 6 history records, got ${data.stageHistory.length}`);

      // The most recent transition should be to Lost with the lostReason
      const latest = data.stageHistory[0];
      assert.equal(latest.toStage, 'Lost');
      assert.equal(latest.lostReason, 'Budget Constraints / No Funds');
    });
  });
});
