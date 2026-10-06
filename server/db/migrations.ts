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
  {
    id: '002_create_companies_and_relations_tables',
    name: 'Create companies, contacts, and leads tables with constraints and indexes for IT mapping',
    up: (db: DatabaseSync) => {
      // 1. Companies Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS companies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          normalized_name TEXT NOT NULL,
          website TEXT NOT NULL,
          normalized_domain TEXT NOT NULL,
          industry TEXT NOT NULL,
          location TEXT NOT NULL,
          employee_size TEXT NOT NULL,
          employee_count INTEGER NOT NULL DEFAULT 0,
          hiring_signals TEXT,
          current_tools TEXT,
          product_fit TEXT NOT NULL DEFAULT 'Medium' CHECK (product_fit IN ('High', 'Medium', 'Low')),
          lead_relevance_score INTEGER NOT NULL DEFAULT 70 CHECK (lead_relevance_score BETWEEN 0 AND 100),
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'Prospect' CHECK (status IN ('Prospect', 'Researching', 'Contacted', 'Qualified', 'Customer', 'Archived', 'Unqualified')),
          created_by TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // 2. Indexes on Companies
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_unique_name ON companies(normalized_name) WHERE status != 'Archived';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_unique_domain ON companies(normalized_domain) WHERE status != 'Archived';
        CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
        CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(location);
        CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
        CREATE INDEX IF NOT EXISTS idx_companies_employee_size ON companies(employee_size);
        CREATE INDEX IF NOT EXISTS idx_companies_product_fit ON companies(product_fit);
        CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);
      `);

      // 3. Contacts Table (for related contacts view in Company details)
      db.exec(`
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          title TEXT,
          department TEXT,
          decision_maker INTEGER NOT NULL DEFAULT 0 CHECK (decision_maker IN (0, 1)),
          linkedin_url TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
        CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
      `);

      // 4. Leads Table (for related leads view in Company details)
      db.exec(`
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL,
          contact_id TEXT,
          title TEXT NOT NULL,
          value REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'New',
          priority TEXT NOT NULL DEFAULT 'Medium',
          source TEXT,
          assigned_to TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
          FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
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
    {
      id: 'usr_viewer_001',
      email: 'viewer@leadgen.com',
      password_hash: repPasswordHash,
      first_name: 'Alex',
      last_name: 'Viewer',
      role: 'viewer',
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

  // Seed Companies for IT Mapping
  const seedCompanies = [
    {
      id: 'cmp_techcorp_01',
      name: 'TechCorp Solutions',
      normalized_name: 'techcorpsolutions',
      website: 'https://techcorp.io',
      normalized_domain: 'techcorp.io',
      industry: 'Cloud & Cybersecurity',
      location: 'San Francisco, CA',
      employee_size: '201-500',
      employee_count: 380,
      hiring_signals: 'Actively hiring 12+ cloud architects & senior DevOps engineers in Q3',
      current_tools: 'Workday, Greenhouse, Jira, AWS, Datadog',
      product_fit: 'High',
      lead_relevance_score: 94,
      notes: 'Target account undergoing migration to multi-cloud. CTO expressed interest in automated compliance tooling.',
      status: 'Qualified',
    },
    {
      id: 'cmp_finpulse_02',
      name: 'FinPulse Capital',
      normalized_name: 'finpulsecapital',
      website: 'https://finpulse.com',
      normalized_domain: 'finpulse.com',
      industry: 'Financial Services',
      location: 'New York, NY',
      employee_size: '501-1000',
      employee_count: 720,
      hiring_signals: 'Hiring Head of Information Security and 8 data engineers',
      current_tools: 'BambooHR, Lever, Bloomberg Terminal, Salesforce',
      product_fit: 'High',
      lead_relevance_score: 88,
      notes: 'High-frequency trading infrastructure with strict regulatory requirements.',
      status: 'Prospect',
    },
    {
      id: 'cmp_nexus_03',
      name: 'Nexus Health Systems',
      normalized_name: 'nexushealthsystems',
      website: 'https://nexushealth.org',
      normalized_domain: 'nexushealth.org',
      industry: 'Healthcare & Biotech',
      location: 'Boston, MA',
      employee_size: '1000-5000',
      employee_count: 2400,
      hiring_signals: 'Expanding telemedicine team; 20+ healthcare IT postings',
      current_tools: 'Workday, Taleo, Epic Systems, Microsoft Azure',
      product_fit: 'Medium',
      lead_relevance_score: 76,
      notes: 'HIPAA compliance is top priority. Currently evaluating modernization of clinical data pipeline.',
      status: 'Researching',
    },
    {
      id: 'cmp_velocix_04',
      name: 'Velocix Logistics',
      normalized_name: 'velocixlogistics',
      website: 'https://velocix.net',
      normalized_domain: 'velocix.net',
      industry: 'Manufacturing & Logistics',
      location: 'Chicago, IL',
      employee_size: '51-200',
      employee_count: 145,
      hiring_signals: 'Hiring VP of Operations and IoT fleet engineers',
      current_tools: 'Rippling, Ashby, SAP, Snowflake',
      product_fit: 'Medium',
      lead_relevance_score: 71,
      notes: 'Expanding real-time telemetry across 500+ commercial vehicles.',
      status: 'Contacted',
    },
    {
      id: 'cmp_apex_05',
      name: 'Apex Retail Cloud',
      normalized_name: 'apexretailcloud',
      website: 'https://apexretail.com',
      normalized_domain: 'apexretail.com',
      industry: 'E-commerce & Retail',
      location: 'Austin, TX',
      employee_size: '201-500',
      employee_count: 310,
      hiring_signals: 'Hiring 6 frontend engineers and payments lead',
      current_tools: 'Gusto, Greenhouse, Stripe, Shopify Plus, Segment',
      product_fit: 'High',
      lead_relevance_score: 91,
      notes: 'Migrating headless e-commerce stack for Q4 holiday peak.',
      status: 'Customer',
    },
    {
      id: 'cmp_zenith_06',
      name: 'Zenith AI Labs',
      normalized_name: 'zenithailabs',
      website: 'https://zenithai.tech',
      normalized_domain: 'zenithai.tech',
      industry: 'Software & SaaS',
      location: 'Seattle, WA',
      employee_size: '11-50',
      employee_count: 38,
      hiring_signals: 'Series A closed; hiring founding engineers and tech recruiter',
      current_tools: 'Rippling, Lever, OpenAI, Modal, GitHub Enterprise',
      product_fit: 'Low',
      lead_relevance_score: 58,
      notes: 'Early stage, high growth. Watching for headcount expansion beyond 50.',
      status: 'Prospect',
    },
  ];

  const insertCompanyStmt = db.prepare(`
    INSERT INTO companies (
      id, name, normalized_name, website, normalized_domain, industry, location,
      employee_size, employee_count, hiring_signals, current_tools, product_fit,
      lead_relevance_score, notes, status, created_by, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_admin_001', datetime('now'), datetime('now'))
    ON CONFLICT(id) DO NOTHING
  `);

  for (const c of seedCompanies) {
    insertCompanyStmt.run(
      c.id, c.name, c.normalized_name, c.website, c.normalized_domain, c.industry,
      c.location, c.employee_size, c.employee_count, c.hiring_signals, c.current_tools,
      c.product_fit, c.lead_relevance_score, c.notes, c.status
    );
  }

  // Seed Contacts for Company Detail view
  const seedContacts = [
    {
      id: 'cnt_001',
      company_id: 'cmp_techcorp_01',
      name: 'Alex Rivera',
      email: 'a.rivera@techcorp.io',
      phone: '+1 (415) 555-0142',
      title: 'VP of Engineering',
      department: 'Engineering',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/alex-rivera-tech',
    },
    {
      id: 'cnt_002',
      company_id: 'cmp_techcorp_01',
      name: 'Elena Rostova',
      email: 'e.rostova@techcorp.io',
      phone: '+1 (415) 555-0188',
      title: 'Director of Talent Acquisition',
      department: 'Human Resources',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/elena-rostova-hr',
    },
    {
      id: 'cnt_003',
      company_id: 'cmp_finpulse_02',
      name: 'Marcus Sterling',
      email: 'm.sterling@finpulse.com',
      phone: '+1 (212) 555-0199',
      title: 'Chief Information Security Officer',
      department: 'Security & Infrastructure',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/marcus-sterling-ciso',
    },
    {
      id: 'cnt_004',
      company_id: 'cmp_nexus_03',
      name: 'Dr. Aris Thorne',
      email: 'athorne@nexushealth.org',
      phone: '+1 (617) 555-0164',
      title: 'Chief Technology Officer',
      department: 'Executive',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/aris-thorne-md',
    },
    {
      id: 'cnt_005',
      company_id: 'cmp_apex_05',
      name: 'Chloe Bennett',
      email: 'chloe@apexretail.com',
      phone: '+1 (512) 555-0123',
      title: 'Head of Infrastructure & Cloud',
      department: 'Engineering',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/chloe-bennett-cloud',
    },
  ];

  const insertContactStmt = db.prepare(`
    INSERT INTO contacts (id, company_id, name, email, phone, title, department, decision_maker, linkedin_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO NOTHING
  `);

  for (const cnt of seedContacts) {
    insertContactStmt.run(
      cnt.id, cnt.company_id, cnt.name, cnt.email, cnt.phone,
      cnt.title, cnt.department, cnt.decision_maker, cnt.linkedin_url
    );
  }

  // Seed Leads for Company Detail view
  const seedLeads = [
    {
      id: 'ld_001',
      company_id: 'cmp_techcorp_01',
      contact_id: 'cnt_001',
      title: 'Enterprise Multi-Cloud Infrastructure Security',
      value: 65000,
      status: 'Qualified',
      priority: 'High',
      source: 'IT Mapping Outreach',
      assigned_to: 'usr_sales_001',
    },
    {
      id: 'ld_002',
      company_id: 'cmp_finpulse_02',
      contact_id: 'cnt_003',
      title: 'High-Frequency FinTech Data Pipeline Migration',
      value: 95000,
      status: 'New',
      priority: 'Urgent',
      source: 'Direct Sourced',
      assigned_to: 'usr_sales_001',
    },
    {
      id: 'ld_003',
      company_id: 'cmp_apex_05',
      contact_id: 'cnt_005',
      title: 'Omnichannel Cloud Scale Expansion',
      value: 48000,
      status: 'Won',
      priority: 'High',
      source: 'Referral',
      assigned_to: 'usr_manager_001',
    },
  ];

  const insertLeadStmt = db.prepare(`
    INSERT INTO leads (id, company_id, contact_id, title, value, status, priority, source, assigned_to, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO NOTHING
  `);

  for (const ld of seedLeads) {
    insertLeadStmt.run(
      ld.id, ld.company_id, ld.contact_id, ld.title, ld.value,
      ld.status, ld.priority, ld.source, ld.assigned_to
    );
  }
}
