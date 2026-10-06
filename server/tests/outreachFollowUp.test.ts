process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { initDb } from '../db/migrate';
import {
  computeFollowUpStatus,
  CADENCE_STEPS,
  VALID_ACTIVITY_TYPES,
} from '../services/outreachService';

const app = createApp();

describe('Phase 7 — Outreach & Follow-Up Test Suite', () => {
  let adminToken: string;
  let viewerToken: string;
  const leadId = 'ld_001';

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

  describe('1. Unit Tests: Date Logic & 15-Day Cadence Calculation', () => {
    it('should verify 15-day cadence steps: Day 1 email, Day 3 LinkedIn, Day 6 call, Day 10 email, Day 15 final follow-up', () => {
      assert.strictEqual(CADENCE_STEPS.length, 5);
      assert.strictEqual(CADENCE_STEPS[0].day, 1);
      assert.strictEqual(CADENCE_STEPS[0].type, 'Email');
      assert.strictEqual(CADENCE_STEPS[1].day, 3);
      assert.strictEqual(CADENCE_STEPS[1].type, 'LinkedIn');
      assert.strictEqual(CADENCE_STEPS[2].day, 6);
      assert.strictEqual(CADENCE_STEPS[2].type, 'Phone');
      assert.strictEqual(CADENCE_STEPS[3].day, 10);
      assert.strictEqual(CADENCE_STEPS[3].type, 'Email');
      assert.strictEqual(CADENCE_STEPS[4].day, 15);
      assert.strictEqual(CADENCE_STEPS[4].type, 'Email');
    });

    it('should compute Overdue when due_date is in the past and status is Pending', () => {
      const fixedNow = new Date('2026-10-06T12:00:00Z');
      const pastDate = '2026-10-04T10:00:00Z';
      const status = computeFollowUpStatus(pastDate, 'Pending', fixedNow);
      assert.strictEqual(status, 'Overdue');
    });

    it('should compute Due Today when due_date is current day and status is Pending', () => {
      const fixedNow = new Date('2026-10-06T12:00:00Z');
      const todayDate = '2026-10-06T09:00:00Z';
      const status = computeFollowUpStatus(todayDate, 'Pending', fixedNow);
      assert.strictEqual(status, 'Due Today');
    });

    it('should compute Upcoming when due_date is in the future and status is Pending', () => {
      const fixedNow = new Date('2026-10-06T12:00:00Z');
      const futureDate = '2026-10-12T15:00:00Z';
      const status = computeFollowUpStatus(futureDate, 'Pending', fixedNow);
      assert.strictEqual(status, 'Upcoming');
    });

    it('should compute Completed regardless of due date when status is Completed', () => {
      const fixedNow = new Date('2026-10-06T12:00:00Z');
      const pastDate = '2026-10-01T10:00:00Z';
      const status = computeFollowUpStatus(pastDate, 'Completed', fixedNow);
      assert.strictEqual(status, 'Completed');
    });
  });

  describe('2. Outreach Activities API (POST, GET, PATCH, DELETE)', () => {
    let createdActivityId: string;

    it('should reject unauthenticated activity creation (401)', async () => {
      const res = await request(app)
        .post('/api/v1/activities')
        .send({
          leadId,
          type: 'Email',
          notes: 'Test email without auth',
        });

      assert.strictEqual(res.status, 401);
    });

    it('should reject activity creation from user without leads:write permission (403)', async () => {
      const res = await request(app)
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          leadId,
          type: 'Email',
          notes: 'Viewer cannot write activities',
        });

      assert.strictEqual(res.status, 403);
    });

    it('should reject activity creation with invalid activity type (400)', async () => {
      const res = await request(app)
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadId,
          type: 'CarrierPigeon',
          notes: 'Invalid type',
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { code: string }).code, 'INVALID_ACTIVITY_TYPE');
    });

    it('should successfully log outreach activity and simultaneously schedule next follow-up (201)', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadId,
          type: 'Email',
          subject: 'Day 1: Initial Discovery Value Pitch',
          notes: 'Delivered initial product assessment overview to Elena Rostova.',
          cadenceDay: 1,
          scheduleFollowUp: {
            title: 'Day 3: LinkedIn Touchpoint',
            type: 'LinkedIn',
            dueDate: tomorrow,
            notes: 'Connect on LinkedIn if email is not acknowledged.',
            cadenceDay: 3,
          },
        });

      assert.strictEqual(res.status, 201);
      const data = (res.body as { data: { id: string; type: string; cadence_day: number; user_name: string } }).data;
      assert.ok(data.id);
      assert.strictEqual(data.type, 'Email');
      assert.strictEqual(data.cadence_day, 1);
      assert.ok(data.user_name);
      createdActivityId = data.id;
    });

    it('should retrieve activity timeline for a lead ordered descending (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/activities/lead/${leadId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const activities = (res.body as { data: Array<{ id: string; lead_id: string; activity_date: string }> }).data;
      assert.ok(Array.isArray(activities));
      assert.ok(activities.length >= 2);
      assert.strictEqual(activities[0].lead_id, leadId);
    });

    it('should update activity notes and subject (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/activities/${createdActivityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Updated: Day 1 Pitch Delivered with Deck',
          notes: 'Elena opened email and requested follow-up call on LinkedIn.',
        });

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { subject: string; notes: string } }).data;
      assert.strictEqual(data.subject, 'Updated: Day 1 Pitch Delivered with Deck');
      assert.strictEqual(data.notes, 'Elena opened email and requested follow-up call on LinkedIn.');
    });
  });

  describe('3. Follow-ups Management & Backend Date Calculation (POST, GET, COMPLETE, RESCHEDULE)', () => {
    let testFollowUpId: string;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const pastDate = new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0];
    const futureDate = new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0];

    it('should create an overdue follow-up task and verify computed_status is Overdue (201)', async () => {
      const res = await request(app)
        .post('/api/v1/follow-ups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          leadId,
          title: 'Day 3: LinkedIn Follow-up Note',
          type: 'LinkedIn',
          dueDate: pastDate,
          notes: 'Check LinkedIn connection status.',
          cadenceDay: 3,
        });

      assert.strictEqual(res.status, 201);
      const data = (res.body as { data: { id: string; computed_status: string; due_date: string } }).data;
      assert.ok(data.id);
      assert.strictEqual(data.computed_status, 'Overdue');
      testFollowUpId = data.id;
    });

    it('should retrieve follow-up summary with actual date metrics (200)', async () => {
      const res = await request(app)
        .get('/api/v1/follow-ups/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const summary = (res.body as { data: { overdue: number; dueToday: number; upcoming: number; completed: number; total: number } }).data;
      assert.ok(summary.total > 0);
      assert.ok(summary.overdue >= 1);
    });

    it('should filter follow-ups by filter=overdue (200)', async () => {
      const res = await request(app)
        .get('/api/v1/follow-ups?filter=overdue')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { items: Array<{ computed_status: string; status: string }> } }).data;
      assert.ok(data.items.length >= 1);
      for (const item of data.items) {
        assert.strictEqual(item.computed_status, 'Overdue');
        assert.strictEqual(item.status, 'Pending');
      }
    });

    it('should filter follow-ups by filter=today (200)', async () => {
      const res = await request(app)
        .get('/api/v1/follow-ups?filter=today')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { items: Array<{ computed_status: string; due_date: string }> } }).data;
      for (const item of data.items) {
        assert.strictEqual(item.computed_status, 'Due Today');
        assert.strictEqual(item.due_date.split('T')[0], todayStr);
      }
    });

    it('should complete follow-up and record completion metadata (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/follow-ups/${testFollowUpId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Connected successfully with Elena. She agreed to take a discovery demo on Thursday.',
        });

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { status: string; computed_status: string; completed_at: string; completed_by_name: string } }).data;
      assert.strictEqual(data.status, 'Completed');
      assert.strictEqual(data.computed_status, 'Completed');
      assert.ok(data.completed_at);
      assert.ok(data.completed_by_name);
    });

    it('should reschedule follow-up to future date, reset to Pending, and increment rescheduled_count (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/follow-ups/${testFollowUpId}/reschedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dueDate: futureDate,
          notes: 'Rescheduling demo alignment to early next week per Elena request.',
        });

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { status: string; computed_status: string; rescheduled_count: number; due_date: string } }).data;
      assert.strictEqual(data.status, 'Pending');
      assert.strictEqual(data.computed_status, 'Upcoming');
      assert.strictEqual(data.rescheduled_count, 1);
      assert.strictEqual(data.due_date, futureDate);
    });

    it('should search follow-ups by lead or company name (200)', async () => {
      const res = await request(app)
        .get('/api/v1/follow-ups?search=TechCorp')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = (res.body as { data: { items: Array<{ company_name: string }> } }).data;
      assert.ok(data.items.length >= 1);
      assert.ok(data.items.some((i) => i.company_name.includes('TechCorp')));
    });

    it('should delete a follow-up (200)', async () => {
      const res = await request(app)
        .delete(`/api/v1/follow-ups/${testFollowUpId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.body as { success: boolean }).success, true);
    });
  });
});
