import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

export interface Migration {
  id: string;
  name: string;
  up: (db: DatabaseSync) => void;
}

export const migrations: Migration[] = [
  {
    id: '001_create_auth_tables',
    name: 'Create users, roles, permissions and sessions tables with constraints and indexes',
    up: (db: DatabaseSync) => {
      // 1. Roles table
      db.exec(`
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // 2. Permissions table
      db.exec(`
        CREATE TABLE IF NOT EXISTS permissions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL
        );
      `);

      // 3. Role-Permissions mapping table
      db.exec(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          role_id TEXT NOT NULL,
          permission_id TEXT NOT NULL,
          PRIMARY KEY (role_id, permission_id),
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        );
      `);

      // 4. Users table with status, constraints, and audit fields
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'sales_rep',
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
          last_login_at TEXT,
          login_count INTEGER NOT NULL DEFAULT 0,
          password_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
          failed_login_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (role) REFERENCES roles(id) ON UPDATE CASCADE
        );
      `);

      // 5. Unique constraint & indexes on users
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      `);

      // 6. User Sessions table for active session management & invalidation
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          is_revoked INTEGER NOT NULL DEFAULT 0 CHECK (is_revoked IN (0, 1)),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 7. Indexes on sessions
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(is_revoked);
      `);
    },
  },
];

export function runMigrations(db: DatabaseSync): { applied: string[]; total: number } {
  // Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedRows = db.prepare('SELECT id FROM _migrations').all() as unknown as { id: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.id));

  const freshlyApplied: string[] = [];

  for (const migration of migrations) {
    if (!appliedSet.has(migration.id)) {
      db.exec('BEGIN TRANSACTION;');
      try {
        migration.up(db);
        const insertStmt = db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)');
        insertStmt.run(migration.id, migration.name);
        db.exec('COMMIT;');
        freshlyApplied.push(migration.id);
      } catch (err) {
        db.exec('ROLLBACK;');
        throw new Error(`Migration ${migration.id} failed: ${(err as Error).message}`);
      }
    }
  }

  return {
    applied: freshlyApplied,
    total: migrations.length,
  };
}

export function verifyDatabaseIntegrity(db: DatabaseSync): {
  integrity: boolean;
  foreignKeys: boolean;
  details: string[];
} {
  const details: string[] = [];

  // Check general DB integrity
  const integrityRows = db.prepare('PRAGMA integrity_check').all() as unknown as { integrity_check: string }[];
  const integrityOk = integrityRows.length === 1 && integrityRows[0].integrity_check === 'ok';
  if (!integrityOk) {
    details.push(`Integrity check failed: ${JSON.stringify(integrityRows)}`);
  }

  // Check foreign key consistency
  const fkRows = db.prepare('PRAGMA foreign_key_check').all() as unknown as Record<string, unknown>[];
  const foreignKeysOk = fkRows.length === 0;
  if (!foreignKeysOk) {
    details.push(`Foreign key violations found: ${JSON.stringify(fkRows)}`);
  }

  return {
    integrity: integrityOk,
    foreignKeys: foreignKeysOk,
    details,
  };
}

export async function seedDatabase(db: DatabaseSync): Promise<void> {
  const roles = [
    {
      id: 'admin',
      name: 'System Administrator',
      description: 'Complete system access, user management, and security administration',
    },
    {
      id: 'manager',
      name: 'Sales Manager',
      description: 'Team management, pipeline analytics, lead routing, and report generation',
    },
    {
      id: 'sales_rep',
      name: 'Sales Representative',
      description: 'Lead generation, contact qualification, campaign tracking, and follow-ups',
    },
    {
      id: 'viewer',
      name: 'Read-Only Viewer',
      description: 'View-only access to dashboard, reports, and leads',
    },
  ];

  const permissions = [
    { id: 'users:read', name: 'View Users', description: 'Can view user lists and team members' },
    { id: 'users:manage', name: 'Manage Users', description: 'Can create, edit, activate/deactivate users' },
    { id: 'leads:read', name: 'View Leads', description: 'Can view lead records' },
    { id: 'leads:write', name: 'Manage Leads', description: 'Can create, edit, delete leads' },
    { id: 'companies:read', name: 'View Companies', description: 'Can view company data' },
    { id: 'companies:write', name: 'Manage Companies', description: 'Can manage company data' },
    { id: 'contacts:read', name: 'View Contacts', description: 'Can view contact records' },
    { id: 'contacts:write', name: 'Manage Contacts', description: 'Can manage contact records' },
    { id: 'reports:read', name: 'View Reports', description: 'Can view analytical reports' },
    { id: 'reports:export', name: 'Export Reports', description: 'Can export report data' },
    { id: 'settings:manage', name: 'Manage Settings', description: 'Can change application configuration' },
  ];

  const rolePermissionMap: Record<string, string[]> = {
    admin: [
      'users:read',
      'users:manage',
      'leads:read',
      'leads:write',
      'companies:read',
      'companies:write',
      'contacts:read',
      'contacts:write',
      'reports:read',
      'reports:export',
      'settings:manage',
    ],
    manager: [
      'users:read',
      'leads:read',
      'leads:write',
      'companies:read',
      'companies:write',
      'contacts:read',
      'contacts:write',
      'reports:read',
      'reports:export',
    ],
    sales_rep: [
      'leads:read',
      'leads:write',
      'companies:read',
      'companies:write',
      'contacts:read',
      'contacts:write',
      'reports:read',
    ],
    viewer: ['leads:read', 'companies:read', 'contacts:read', 'reports:read'],
  };

  // Upsert roles
  const insertRoleStmt = db.prepare(`
    INSERT INTO roles (id, name, description)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description
  `);
  for (const r of roles) {
    insertRoleStmt.run(r.id, r.name, r.description);
  }

  // Upsert permissions
  const insertPermStmt = db.prepare(`
    INSERT INTO permissions (id, name, description)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description
  `);
  for (const p of permissions) {
    insertPermStmt.run(p.id, p.name, p.description);
  }

  // Map role permissions
  const insertRolePermStmt = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    VALUES (?, ?)
  `);
  for (const [roleId, perms] of Object.entries(rolePermissionMap)) {
    for (const permId of perms) {
      insertRolePermStmt.run(roleId, permId);
    }
  }

  // Seed default development users
  const defaultPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const managerPasswordHash = await bcrypt.hash('Manager@12345', 10);
  const repPasswordHash = await bcrypt.hash('Sakshi@12345', 10);

  const seedUsers = [
    {
      id: 'usr_admin_001',
      email: 'admin@leadgen.com',
      password_hash: defaultPasswordHash,
      first_name: 'System',
      last_name: 'Administrator',
      role: 'admin',
      status: 'active',
    },
    {
      id: 'usr_manager_001',
      email: 'manager@leadgen.com',
      password_hash: managerPasswordHash,
      first_name: 'Sarah',
      last_name: 'Connor',
      role: 'manager',
      status: 'active',
    },
    {
      id: 'usr_sales_001',
      email: 'sakshi@leadgen.com',
      password_hash: repPasswordHash,
      first_name: 'Sakshi',
      last_name: 'Koparde',
      role: 'sales_rep',
      status: 'active',
    },
  ];

  const insertUserStmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, password_changed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    ON CONFLICT(email) DO NOTHING
  `);

  for (const u of seedUsers) {
    insertUserStmt.run(u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.status);
  }
}
