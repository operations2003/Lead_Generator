import { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/database';
import { UserRecord, SafeUser } from '../db/types';

export class UserService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  getUserPermissions(roleId: string): string[] {
    const rows = this.db.prepare(`
      SELECT permission_id FROM role_permissions WHERE role_id = ?
    `).all(roleId) as unknown as { permission_id: string }[];
    return rows.map((r) => r.permission_id);
  }

  toSafeUser(record: UserRecord): SafeUser {
    const permissions = this.getUserPermissions(record.role);
    return {
      id: record.id,
      email: record.email,
      firstName: record.first_name,
      lastName: record.last_name,
      role: record.role,
      status: record.status,
      permissions,
      lastLoginAt: record.last_login_at,
      createdAt: record.created_at,
    };
  }

  findByEmail(email: string): UserRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM users WHERE lower(email) = lower(?)
    `).get(email) as unknown as UserRecord | undefined;
    return row || null;
  }

  findById(id: string): UserRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).get(id) as unknown as UserRecord | undefined;
    return row || null;
  }

  getAllUsers(): SafeUser[] {
    const rows = this.db.prepare(`
      SELECT * FROM users ORDER BY created_at DESC
    `).all() as unknown as UserRecord[];
    return rows.map((r) => this.toSafeUser(r));
  }

  updateStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): SafeUser | null {
    this.db.prepare(`
      UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, userId);

    const updated = this.findById(userId);
    return updated ? this.toSafeUser(updated) : null;
  }

  updateRole(userId: string, role: string): SafeUser | null {
    this.db.prepare(`
      UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?
    `).run(role, userId);

    const updated = this.findById(userId);
    return updated ? this.toSafeUser(updated) : null;
  }
}
