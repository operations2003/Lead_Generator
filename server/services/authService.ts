import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import { SafeUser, SessionRecord } from '../db/types';
import { UserService } from './userService';
import { hashPassword, comparePassword, generateToken, verifyToken, hashToken } from '../utils/security';
import { config } from '../config';

export interface LoginResult {
  user: SafeUser;
  token: string;
  expiresIn: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export class AuthService {
  private db: DatabaseSync;
  private userService: UserService;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
    this.userService = new UserService(this.db);
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const user = this.userService.findByEmail(email);

    if (!user) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    // Check account status
    if (user.status === 'suspended') {
      throw { status: 403, message: 'Account is suspended. Please contact your system administrator.' };
    }
    if (user.status === 'inactive') {
      throw { status: 403, message: 'Account is deactivated. Please contact your system administrator.' };
    }

    // Check account lockout
    if (user.locked_until) {
      const lockUntil = new Date(user.locked_until).getTime();
      const now = Date.now();
      if (lockUntil > now) {
        const remainingMinutes = Math.ceil((lockUntil - now) / (60 * 1000));
        throw {
          status: 429,
          message: `Account is temporarily locked due to excessive failed attempts. Please try again in ${remainingMinutes} minute(s).`,
        };
      } else {
        // Lock expired, reset failed attempts
        this.db.prepare(`
          UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?
        `).run(user.id);
      }
    }

    // Verify password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      const updatedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockUntilSql: string | null = null;

      if (updatedAttempts >= config.maxLoginAttempts) {
        const lockDate = new Date(Date.now() + config.lockoutDurationMinutes * 60 * 1000);
        lockUntilSql = lockDate.toISOString();
      }

      this.db.prepare(`
        UPDATE users
        SET failed_login_attempts = ?, locked_until = ?
        WHERE id = ?
      `).run(updatedAttempts, lockUntilSql, user.id);

      if (lockUntilSql) {
        throw {
          status: 429,
          message: `Too many failed login attempts. Your account is locked for ${config.lockoutDurationMinutes} minutes.`,
        };
      }

      throw { status: 401, message: 'Invalid email or password' };
    }

    // Reset login failures and update metadata
    this.db.prepare(`
      UPDATE users
      SET failed_login_attempts = 0,
          locked_until = NULL,
          last_login_at = datetime('now'),
          login_count = login_count + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session record
    const sessionId = 'ses_' + crypto.randomUUID().replace(/-/g, '');
    const tokenSha = hashToken(token);
    // Expiration: 24h
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    this.db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent, is_revoked, created_at, last_activity_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `).run(sessionId, user.id, tokenSha, expiresAt, ipAddress || null, userAgent || null);

    const safeUser = this.userService.toSafeUser(user);
    // Refresh user's last login for return
    safeUser.lastLoginAt = new Date().toISOString();

    return {
      user: safeUser,
      token,
      expiresIn: config.jwtExpiresIn,
    };
  }

  async register(input: RegisterInput): Promise<SafeUser> {
    const existing = this.userService.findByEmail(input.email);
    if (existing) {
      throw { status: 409, message: 'A user with this email address already exists.' };
    }

    const userId = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const passwordHash = await hashPassword(input.password);
    const role = input.role || 'sales_rep';

    this.db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, password_changed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'), datetime('now'))
    `).run(userId, input.email.trim().toLowerCase(), passwordHash, input.firstName.trim(), input.lastName.trim(), role);

    const created = this.userService.findById(userId);
    if (!created) {
      throw { status: 500, message: 'Failed to create user record.' };
    }

    return this.userService.toSafeUser(created);
  }

  logout(token: string): boolean {
    const tokenSha = hashToken(token);
    const result = this.db.prepare(`
      UPDATE sessions
      SET is_revoked = 1, last_activity_at = datetime('now')
      WHERE token_hash = ?
    `).run(tokenSha);

    return (result.changes ?? 0) > 0;
  }

  validateSession(token: string): { user: SafeUser; session: SessionRecord } {
    const payload = verifyToken(token);
    if (!payload) {
      throw { status: 401, message: 'Invalid or expired token' };
    }

    const tokenSha = hashToken(token);
    const session = this.db.prepare(`
      SELECT * FROM sessions WHERE token_hash = ?
    `).get(tokenSha) as unknown as SessionRecord | undefined;

    if (!session) {
      throw { status: 401, message: 'Session not found or invalid' };
    }

    if (session.is_revoked === 1) {
      throw { status: 401, message: 'Session has been revoked or logged out' };
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      throw { status: 401, message: 'Session has expired. Please log in again.' };
    }

    const user = this.userService.findById(payload.userId);
    if (!user) {
      throw { status: 401, message: 'User associated with session not found' };
    }

    if (user.status !== 'active') {
      throw { status: 403, message: `Account is ${user.status}. Access denied.` };
    }

    // Update last activity on valid session
    this.db.prepare(`
      UPDATE sessions SET last_activity_at = datetime('now') WHERE id = ?
    `).run(session.id);

    return {
      user: this.userService.toSafeUser(user),
      session,
    };
  }
}
