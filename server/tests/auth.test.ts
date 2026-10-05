process.env.NODE_ENV = 'test';

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { getDb } from '../db/database';
import { initDb } from '../db/migrate';

const app = createApp();

describe('Phase 2 — Authentication & Authorization Test Suite', () => {
  let adminToken: string;
  let repToken: string;

  before(async () => {
    // Ensure database and initial seeds are loaded
    await initDb();
  });

  beforeEach(() => {
    const db = getDb();
    db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL').run();
  });

  describe('1. Valid Login', () => {
    it('should log in successfully with valid admin credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@leadgen.com',
          password: 'Admin@12345',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token, 'Token should be returned');
      assert.equal(res.body.data.user.email, 'admin@leadgen.com');
      assert.equal(res.body.data.user.role, 'admin');
      assert.ok(Array.isArray(res.body.data.user.permissions));
      assert.ok(res.body.data.user.permissions.includes('users:manage'));

      // Security check: Never return password or password_hash
      assert.equal(res.body.data.user.password, undefined);
      assert.equal(res.body.data.user.password_hash, undefined);

      adminToken = res.body.data.token;
    });

    it('should log in successfully with sales rep credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'sakshi@leadgen.com',
          password: 'Sakshi@12345',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.role, 'sales_rep');

      repToken = res.body.data.token;
    });
  });

  describe('2. Invalid Login', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@leadgen.com',
          password: 'WrongPassword123!',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_CREDENTIALS');
      assert.equal(res.body.data, undefined);
    });

    it('should reject login with nonexistent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@leadgen.com',
          password: 'AnyPassword123!',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_CREDENTIALS');
    });

    it('should reject login with missing or invalid fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  describe('3. Protected Endpoint Without Authentication', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'AUTH_TOKEN_MISSING');
    });

    it('should return 401 when authorization header format is malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidHeaderFormatHere');

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'AUTH_TOKEN_MALFORMED');
    });
  });

  describe('4. Invalid or Revoked Session', () => {
    it('should return 401 for fabricated or corrupt token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupt.payload');

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'AUTH_SESSION_INVALID');
    });

    it('should invalidate session on logout and reject subsequent calls with same token', async () => {
      // 1. Login a temporary user
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@leadgen.com',
          password: 'Admin@12345',
        });
      assert.equal(loginRes.status, 200, `Login failed: ${JSON.stringify(loginRes.body)}`);
      const tempToken = loginRes.body.data.token;

      // 2. Token works
      const checkRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      assert.equal(checkRes.status, 200);

      // 3. Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tempToken}`);
      assert.equal(logoutRes.status, 200);

      // 4. Token now rejected
      const revokedRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      assert.equal(revokedRes.status, 401);
      assert.match(revokedRes.body.message, /revoked/i);
    });
  });

  describe('5. Authorized Request', () => {
    it('should allow admin user to access /api/v1/users (has users:read)', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 2);
    });

    it('should allow admin user to access /api/v1/auth/me and verify full profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.email, 'admin@leadgen.com');
      assert.equal(res.body.data.role, 'admin');
    });
  });

  describe('6. Unauthorized Request (RBAC / Forbidden)', () => {
    it('should forbid sales_rep from modifying user status (requires admin role)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/usr_admin_001/status')
        .set('Authorization', `Bearer ${repToken}`)
        .send({ status: 'suspended' });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'FORBIDDEN_ROLE');
    });

    it('should forbid sales_rep from creating a new user (requires users:manage permission)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          email: 'unauth-created@leadgen.com',
          password: 'Password123!',
          firstName: 'Illegal',
          lastName: 'Create',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'FORBIDDEN_PERMISSION');
    });
  });

  describe('7. User Registration & Duplicate Email Constraint', () => {
    const testEmail = `newuser_${Date.now()}@leadgen.com`;

    it('should successfully register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'Candidate',
          role: 'sales_rep',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, testEmail.toLowerCase());
      assert.equal(res.body.data.password_hash, undefined);
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'AnotherPassword123!',
          firstName: 'Duplicate',
          lastName: 'User',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'USER_EXISTS');
    });
  });

  describe('8. Account Status Verification (Suspended User Denial)', () => {
    it('should block suspended user from logging in', async () => {
      const db = getDb();
      // Temporarily mark a user suspended
      db.prepare("UPDATE users SET status = 'suspended' WHERE email = 'manager@leadgen.com'").run();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'manager@leadgen.com',
          password: 'Manager@12345',
        });

      assert.equal(res.status, 403);
      assert.match(res.body.message, /suspended/i);

      // Restore user back to active
      db.prepare("UPDATE users SET status = 'active' WHERE email = 'manager@leadgen.com'").run();
    });
  });
});
