/// <reference path="../types/sqlite.d.ts" />
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
  {
    id: '003_enhance_contacts_schema',
    name: 'Add notes, status, and targeted role indexes to contacts table with foreign key integrity',
    up: (db: DatabaseSync) => {
      // Check existing columns in contacts
      const tableInfo = db.prepare("PRAGMA table_info(contacts)").all() as unknown as { name: string }[];
      const colNames = new Set(tableInfo.map((c) => c.name));

      if (!colNames.has('notes')) {
        db.exec(`ALTER TABLE contacts ADD COLUMN notes TEXT;`);
      }
      if (!colNames.has('status')) {
        db.exec(`ALTER TABLE contacts ADD COLUMN status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Contacted', 'Qualified', 'Unresponsive', 'Archived'));`);
      }

      // Add indexes required by Phase 4
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
        CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
        CREATE INDEX IF NOT EXISTS idx_contacts_title ON contacts(title);
        CREATE INDEX IF NOT EXISTS idx_contacts_decision_maker ON contacts(decision_maker);
        CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
        CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
      `);
    },
  },
  {
    id: '004_enhance_leads_qualification_schema',
    name: 'Add product, qualification signals, notes and indexes to leads table',
    up: (db: DatabaseSync) => {
      const tableInfo = db.prepare("PRAGMA table_info(leads)").all() as unknown as { name: string }[];
      const colNames = new Set(tableInfo.map((c) => c.name));

      if (!colNames.has('product')) {
        db.exec(`ALTER TABLE leads ADD COLUMN product TEXT NOT NULL DEFAULT 'Higher IQ';`);
      }
      if (!colNames.has('hiring_volume')) {
        db.exec(`ALTER TABLE leads ADD COLUMN hiring_volume TEXT NOT NULL DEFAULT 'Medium';`);
      }
      if (!colNames.has('hiring_multiple_roles')) {
        db.exec(`ALTER TABLE leads ADD COLUMN hiring_multiple_roles INTEGER NOT NULL DEFAULT 0;`);
      }
      if (!colNames.has('manual_hr_processes')) {
        db.exec(`ALTER TABLE leads ADD COLUMN manual_hr_processes INTEGER NOT NULL DEFAULT 0;`);
      }
      if (!colNames.has('existing_tools')) {
        db.exec(`ALTER TABLE leads ADD COLUMN existing_tools TEXT;`);
      }
      if (!colNames.has('company_size')) {
        db.exec(`ALTER TABLE leads ADD COLUMN company_size TEXT;`);
      }
      if (!colNames.has('decision_maker_identified')) {
        db.exec(`ALTER TABLE leads ADD COLUMN decision_maker_identified INTEGER NOT NULL DEFAULT 0;`);
      }
      if (!colNames.has('qualification_score')) {
        db.exec(`ALTER TABLE leads ADD COLUMN qualification_score INTEGER NOT NULL DEFAULT 50;`);
      }
      if (!colNames.has('qualification_notes')) {
        db.exec(`ALTER TABLE leads ADD COLUMN qualification_notes TEXT;`);
      }
      if (!colNames.has('notes')) {
        db.exec(`ALTER TABLE leads ADD COLUMN notes TEXT;`);
      }

      // Add indexes required by Phase 5
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);
        CREATE INDEX IF NOT EXISTS idx_leads_product ON leads(product);
        CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
        CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(qualification_score);
        CREATE INDEX IF NOT EXISTS idx_leads_company_product ON leads(company_id, product);
      `);
    },
  },
  {
    id: '005_lead_pipeline_and_stage_history',
    name: 'Add lead stage history, pipeline timestamps, lost reasons, and pipeline indexes',
    up: (db: DatabaseSync) => {
      // 1. Add pipeline timestamp & lost reason columns to leads table if missing
      const tableInfo = db.prepare("PRAGMA table_info(leads)").all() as unknown as { name: string }[];
      const colNames = new Set(tableInfo.map((c) => c.name));

      if (!colNames.has('lost_reason')) {
        db.exec(`ALTER TABLE leads ADD COLUMN lost_reason TEXT;`);
      }
      if (!colNames.has('won_at')) {
        db.exec(`ALTER TABLE leads ADD COLUMN won_at TEXT;`);
      }
      if (!colNames.has('lost_at')) {
        db.exec(`ALTER TABLE leads ADD COLUMN lost_at TEXT;`);
      }
      if (!colNames.has('stage_changed_at')) {
        db.exec(`ALTER TABLE leads ADD COLUMN stage_changed_at TEXT;`);
        db.exec(`UPDATE leads SET stage_changed_at = datetime('now') WHERE stage_changed_at IS NULL;`);
      }

      // 2. Create lead_stage_history table for full stage transition traceability
      db.exec(`
        CREATE TABLE IF NOT EXISTS lead_stage_history (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          from_stage TEXT,
          to_stage TEXT NOT NULL,
          changed_by TEXT,
          notes TEXT,
          lost_reason TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // 3. Add pipeline and dashboard query indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_stage_history(lead_id);
        CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON lead_stage_history(created_at);
        CREATE INDEX IF NOT EXISTS idx_lead_history_to_stage ON lead_stage_history(to_stage);
        CREATE INDEX IF NOT EXISTS idx_leads_stage_priority ON leads(status, priority);
        CREATE INDEX IF NOT EXISTS idx_leads_stage_product ON leads(status, product);
        CREATE INDEX IF NOT EXISTS idx_leads_stage_changed_at ON leads(stage_changed_at);
      `);

      // 4. Migrate any old stage names in existing leads to Phase 6 stages
      db.exec(`
        UPDATE leads SET status = 'New' WHERE status IN ('Discovery', 'Prospect');
        UPDATE leads SET status = 'Contacted' WHERE status IN ('Evaluating');
        UPDATE leads SET status = 'Demo Booked' WHERE status IN ('Qualified', 'Proposal Sent');
        UPDATE leads SET status = 'Demo Done' WHERE status IN ('Proposal', 'Negotiation');
      `);
    },
  },
  {
    id: '006_outreach_and_follow_ups',
    name: 'Create outreach activities and follow-ups tables with lead & user relations, types, and indexes',
    up: (db: DatabaseSync) => {
      // 1. Outreach Activities Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS activities (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('Email', 'LinkedIn', 'Phone', 'WhatsApp', 'Demo', 'Other')),
          subject TEXT,
          notes TEXT NOT NULL,
          activity_date TEXT NOT NULL,
          cadence_day INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 2. Activities Indexes (Lead, Activity Type, Activity Date)
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
        CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
        CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
        CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON activities(activity_date);
        CREATE INDEX IF NOT EXISTS idx_activities_lead_date ON activities(lead_id, activity_date DESC);
      `);

      // 3. Follow-ups Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS follow_ups (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          activity_id TEXT,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('Email', 'LinkedIn', 'Phone', 'WhatsApp', 'Demo', 'Other')),
          due_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
          notes TEXT,
          cadence_day INTEGER,
          completed_at TEXT,
          completed_by TEXT,
          rescheduled_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // 4. Follow-ups Indexes (Lead, Follow-up date, Completion status, Activity type)
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id ON follow_ups(user_id);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON follow_ups(due_date);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_type ON follow_ups(type);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_status_due_date ON follow_ups(status, due_date);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_status ON follow_ups(lead_id, status);
      `);
    },
  },
  {
    id: '007_campaigns_templates_reporting',
    name: 'Add campaigns, outreach templates, weekly targets, referral tracking, and campaign metrics',
    up: (db: DatabaseSync) => {
      // 1. Create campaigns table
      db.exec(`
        CREATE TABLE IF NOT EXISTS campaigns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          product TEXT NOT NULL,
          target_audience TEXT,
          industry TEXT,
          location TEXT,
          lead_source TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT,
          status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Paused', 'Completed', 'Archived')),
          assigned_user_id TEXT,
          notes TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // 2. Indexes for campaigns
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_campaigns_name ON campaigns(name);
        CREATE INDEX IF NOT EXISTS idx_campaigns_product ON campaigns(product);
        CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
        CREATE INDEX IF NOT EXISTS idx_campaigns_lead_source ON campaigns(lead_source);
        CREATE INDEX IF NOT EXISTS idx_campaigns_assigned_user ON campaigns(assigned_user_id);
        CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
      `);

      // 3. Extend leads table with campaign connection, referral/partner fields, and ATS score
      const leadTableInfo = db.prepare("PRAGMA table_info(leads)").all() as unknown as { name: string }[];
      const leadCols = new Set(leadTableInfo.map((c) => c.name));

      if (!leadCols.has('campaign_id')) {
        db.exec(`ALTER TABLE leads ADD COLUMN campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL;`);
      }
      if (!leadCols.has('referrer_name')) {
        db.exec(`ALTER TABLE leads ADD COLUMN referrer_name TEXT;`);
      }
      if (!leadCols.has('referrer_contact')) {
        db.exec(`ALTER TABLE leads ADD COLUMN referrer_contact TEXT;`);
      }
      if (!leadCols.has('partner_name')) {
        db.exec(`ALTER TABLE leads ADD COLUMN partner_name TEXT;`);
      }
      if (!leadCols.has('referral_notes')) {
        db.exec(`ALTER TABLE leads ADD COLUMN referral_notes TEXT;`);
      }
      if (!leadCols.has('ats_score')) {
        db.exec(`ALTER TABLE leads ADD COLUMN ats_score REAL;`);
      }

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
        CREATE INDEX IF NOT EXISTS idx_leads_partner_name ON leads(partner_name);
      `);

      // 4. Outreach templates table
      db.exec(`
        CREATE TABLE IF NOT EXISTS outreach_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('Initial Email', 'LinkedIn Message', 'Follow-up Email', 'Call Script', 'WhatsApp Message', 'Demo Follow-up', 'Final Follow-up', 'Email', 'LinkedIn', 'Phone', 'WhatsApp', 'Other')),
          product TEXT NOT NULL DEFAULT 'Both',
          subject TEXT,
          body TEXT NOT NULL,
          sequence_day INTEGER,
          created_by TEXT,
          updated_by TEXT,
          status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // 5. Indexes for outreach templates
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_templates_type ON outreach_templates(type);
        CREATE INDEX IF NOT EXISTS idx_templates_product ON outreach_templates(product);
        CREATE INDEX IF NOT EXISTS idx_templates_status ON outreach_templates(status);
      `);

      // 6. Weekly targets table
      db.exec(`
        CREATE TABLE IF NOT EXISTS weekly_targets (
          id TEXT PRIMARY KEY,
          target_type TEXT NOT NULL CHECK (target_type IN ('companies', 'contacts', 'outreach', 'replies', 'demos')),
          target_value INTEGER NOT NULL CHECK (target_value >= 0),
          user_id TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          created_by TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // 7. Indexes for weekly targets
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_weekly_targets_type ON weekly_targets(target_type);
        CREATE INDEX IF NOT EXISTS idx_weekly_targets_user ON weekly_targets(user_id);
        CREATE INDEX IF NOT EXISTS idx_weekly_targets_dates ON weekly_targets(start_date, end_date);
      `);

      // 8. Seed Default 15-Day Cadence Templates & Channel Scripts
      const templateCount = db.prepare('SELECT COUNT(*) as count FROM outreach_templates').get() as { count: number };
      if (templateCount.count === 0) {
        const templatesToSeed = [
          {
            id: 'tmpl-day1-email-hireiq',
            name: 'Day 1 — Initial Email (HireIQ ATS)',
            type: 'Initial Email',
            product: 'HireIQ',
            subject: 'Transforming technical screening & talent turnaround for {{company}}',
            body: `Hi {{firstName}},\n\nI noticed {{company}} has active technical requisitions and high hiring volume across engineering roles.\n\nHireIQ helps scaling teams automate resume ranking and conduct structured AI assessments, cutting candidate drop-off by 42%.\n\nWould you be open to a 10-minute walkthrough this week to benchmark your candidate pipeline?\n\nBest regards,\n{{senderName}}`,
            sequence_day: 1,
          },
          {
            id: 'tmpl-day1-email-hrms',
            name: 'Day 1 — Initial Email (HRMS Portal)',
            type: 'Initial Email',
            product: 'HRMS',
            subject: 'Eliminating manual HR & payroll bottlenecks at {{company}}',
            body: `Hi {{firstName}},\n\nManaging distributed employee onboarding, attendance, and payroll compliance usually creates friction as organizations scale beyond 50 team members.\n\nOur unified HRMS portal replaces fragmented spreadsheets with automated self-service, real-time leaves, and compliant payroll runs.\n\nCould we explore whether this fits {{company}}'s Q4 operational goals?\n\nBest regards,\n{{senderName}}`,
            sequence_day: 1,
          },
          {
            id: 'tmpl-day3-linkedin',
            name: 'Day 3 — LinkedIn InMail Touch',
            type: 'LinkedIn Message',
            product: 'Both',
            subject: 'Connecting regarding talent systems at {{company}}',
            body: `Hi {{firstName}},\n\nFollowing up on my note regarding {{company}}'s hiring and talent operations. Would love to share our benchmark data on how peers in {{industry}} reduced screening overhead by 40%.\n\nLet's connect!\n{{senderName}}`,
            sequence_day: 3,
          },
          {
            id: 'tmpl-day6-phone',
            name: 'Day 6 — Phone Discovery Script',
            type: 'Call Script',
            product: 'Both',
            subject: 'Discovery Call Script',
            body: `[Greeting & Hook]\n"Hello {{firstName}}, this is {{senderName}} from NexusIT. I'm reaching out because I saw {{company}} is actively expanding your team."\n\n[Pain Check]\n"Are you currently handling technical screening and applicant sorting in-house, or are recruiters spending hours sifting through unqualified resumes?"\n\n[Value Hook]\n"Our platform automates instant skill scoring and candidate screening so your hiring managers only interview verified matches."\n\n[Call to Action]\n"Could we put 15 minutes on the calendar this Thursday for a live demo?"`,
            sequence_day: 6,
          },
          {
            id: 'tmpl-day10-email',
            name: 'Day 10 — Follow-up Email (Case Study & ROI)',
            type: 'Follow-up Email',
            product: 'Both',
            subject: 'Quick question regarding hiring workflow at {{company}}',
            body: `Hi {{firstName}},\n\nWanted to float this back up in your inbox. When fast-growing tech teams scale, recruiting bottlenecks cost an average of $4,200 per delayed hire.\n\nWe helped a peer in {{industry}} streamline 350+ monthly applications down to top-5 candidates within 48 hours.\n\nWould you have 10 minutes next Tuesday or Wednesday for a quick look?\n\nBest,\n{{senderName}}`,
            sequence_day: 10,
          },
          {
            id: 'tmpl-day15-final',
            name: 'Day 15 — Final Polite Break-up Follow-up',
            type: 'Final Follow-up',
            product: 'Both',
            subject: 'Permission to close file for {{company}}?',
            body: `Hi {{firstName}},\n\nI haven't heard back, so I assume talent automation is not a priority for {{company}} at this moment.\n\nI won't continue cluttering your inbox. If hiring velocity or HR operational efficiency ever becomes a focus down the road, feel free to reach back out.\n\nWishing you and the team continued success!\n\nBest regards,\n{{senderName}}`,
            sequence_day: 15,
          },
          {
            id: 'tmpl-whatsapp',
            name: 'WhatsApp Quick Outreach Touch',
            type: 'WhatsApp Message',
            product: 'Both',
            subject: null,
            body: `Hi {{firstName}}, hope you are having a productive week! Reaching out from NexusIT regarding {{company}}'s hiring workflow. We recently released a Free ATS Score Checker for engineering candidates. Let me know if you would like me to send over the link!`,
            sequence_day: null,
          },
          {
            id: 'tmpl-demo-followup',
            name: 'Demo Follow-up & Next Steps',
            type: 'Demo Follow-up',
            product: 'Both',
            subject: 'Next steps & recap from our demo for {{company}}',
            body: `Hi {{firstName}},\n\nThank you for taking the time to review our platform today. As discussed, here is a summary of how we address your key requirements:\n\n1. Automated candidate matching and ATS scoring\n2. Real-time HR dashboard and pipeline traceability\n3. Smooth API integration with existing tools\n\nI have attached our pricing proposal and trial onboarding steps. Let's touch base on {{nextFollowUpDate}} to finalize pilot access.\n\nBest regards,\n{{senderName}}`,
            sequence_day: null,
          },
        ];

        const insertTmpl = db.prepare(`
          INSERT INTO outreach_templates (id, name, type, product, subject, body, sequence_day, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
        `);

        for (const tmpl of templatesToSeed) {
          insertTmpl.run(tmpl.id, tmpl.name, tmpl.type, tmpl.product, tmpl.subject, tmpl.body, tmpl.sequence_day);
        }
      }

      // 9. Seed Sample Campaigns & Link Existing Leads
      const campaignCount = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number };
      if (campaignCount.count === 0) {
        const seedCampaigns = [
          {
            id: 'cmp-q4-hiring-drive',
            name: 'Q4 High-Growth Tech Hiring Drive',
            product: 'HireIQ',
            target_audience: 'Talent Acquisition Heads & VP Engineering',
            industry: 'IT & Cloud Services',
            location: 'Bangalore / Remote',
            lead_source: 'LinkedIn',
            start_date: '2026-10-01',
            end_date: '2026-12-31',
            status: 'Active',
            notes: 'Targeting scaling SaaS and fintech companies actively recruiting 10+ developers.',
          },
          {
            id: 'cmp-hrms-automation-2026',
            name: 'HRMS Modernization & Compliance 2026',
            product: 'HRMS',
            target_audience: 'HR Directors & CFOs',
            industry: 'FinTech & Banking',
            location: 'Mumbai & Delhi NCR',
            lead_source: 'Website',
            start_date: '2026-09-15',
            end_date: '2026-11-30',
            status: 'Active',
            notes: 'Outreach campaign focused on payroll automation and compliance.',
          },
          {
            id: 'cmp-free-ats-score-inbound',
            name: 'Free ATS Score Check Inbound Campaign',
            product: 'HireIQ',
            target_audience: 'Recruiting Managers & HR Operations',
            industry: 'Cross-Industry',
            location: 'Pan-India',
            lead_source: 'Free ATS Score Check',
            start_date: '2026-10-05',
            end_date: '2026-12-31',
            status: 'Active',
            notes: 'Inbound lead capture offering candidate resume optimization and automated ATS score analysis.',
          },
        ];

        const insertCmp = db.prepare(`
          INSERT INTO campaigns (id, name, product, target_audience, industry, location, lead_source, start_date, end_date, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const c of seedCampaigns) {
          insertCmp.run(c.id, c.name, c.product, c.target_audience, c.industry, c.location, c.lead_source, c.start_date, c.end_date, c.status, c.notes);
        }

        // Link existing leads to sample campaigns for real metric calculations
        db.exec(`
          UPDATE leads SET campaign_id = 'cmp-q4-hiring-drive', source = 'LinkedIn'
          WHERE product = 'Higher IQ' AND campaign_id IS NULL;

          UPDATE leads SET campaign_id = 'cmp-hrms-automation-2026', source = 'Website'
          WHERE product = 'HRMS Portal' AND campaign_id IS NULL;
        `);
      }

      // 10. Seed Default Weekly Targets
      const targetCount = db.prepare('SELECT COUNT(*) as count FROM weekly_targets').get() as { count: number };
      if (targetCount.count === 0) {
        // Calculate current week start (Monday) and end (Sunday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startStr = monday.toISOString().split('T')[0];
        const endStr = sunday.toISOString().split('T')[0];

        const defaultTargets = [
          { type: 'companies', value: 25 },
          { type: 'contacts', value: 50 },
          { type: 'outreach', value: 75 },
          { type: 'replies', value: 20 },
          { type: 'demos', value: 8 },
        ];

        const insertTarget = db.prepare(`
          INSERT INTO weekly_targets (id, target_type, target_value, user_id, start_date, end_date)
          VALUES (?, ?, ?, NULL, ?, ?)
        `);

        let targetIdx = 1;
        for (const t of defaultTargets) {
          insertTarget.run(`wt-default-${targetIdx++}`, t.type, t.value, startStr, endStr);
        }
      }
    },
  },
  {
    id: '008_phase9_search_optimization_and_data_quality',
    name: 'Add optimized indexes for search, filtering, reporting, and data quality integrity',
    up: (db: DatabaseSync) => {
      // 1. Company Search & Filter Indexes
      // Company name, Industry, Location, Employee size, Hiring signals, Existing tools, Product fit
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
        CREATE INDEX IF NOT EXISTS idx_companies_normalized_name ON companies(normalized_name);
        CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
        CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(location);
        CREATE INDEX IF NOT EXISTS idx_companies_employee_size ON companies(employee_size);
        CREATE INDEX IF NOT EXISTS idx_companies_current_tools ON companies(current_tools);
        CREATE INDEX IF NOT EXISTS idx_companies_hiring_signals ON companies(hiring_signals);
        CREATE INDEX IF NOT EXISTS idx_companies_product_fit ON companies(product_fit);
        CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);
        CREATE INDEX IF NOT EXISTS idx_companies_search_opt ON companies(status, industry, product_fit, employee_size);
      `);

      // 2. Contact Search & Filter Indexes
      // Contact name, Email, Job title, Decision-maker, Company
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
        CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
        CREATE INDEX IF NOT EXISTS idx_contacts_title ON contacts(title);
        CREATE INDEX IF NOT EXISTS idx_contacts_decision_maker ON contacts(decision_maker);
        CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
        CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
        CREATE INDEX IF NOT EXISTS idx_contacts_search_opt ON contacts(status, decision_maker, company_id);
      `);

      // 3. Lead Search, Filter & Pipeline Indexes
      // Product, Priority, Stage (status), Source, Campaign, Existing tool, Hiring signals, Follow-up date
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_leads_product ON leads(product);
        CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
        CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_leads_existing_tools ON leads(existing_tools);
        CREATE INDEX IF NOT EXISTS idx_leads_hiring_volume ON leads(hiring_volume);
        CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(qualification_score);
        CREATE INDEX IF NOT EXISTS idx_leads_company_contact ON leads(company_id, contact_id);
        CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
        CREATE INDEX IF NOT EXISTS idx_leads_search_opt ON leads(status, priority, product, qualification_score);
        CREATE INDEX IF NOT EXISTS idx_leads_signals_opt ON leads(hiring_volume, hiring_multiple_roles, manual_hr_processes);
      `);

      // 4. Follow-up and Activity Indexes
      // Follow-up date, lead status, due date, activities date
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON follow_ups(due_date);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_status_due ON follow_ups(status, due_date);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_status_due ON follow_ups(lead_id, status, due_date);
        CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON activities(activity_date);
        CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON lead_stage_history(created_at);
      `);

      // 5. Query planner analysis
      db.exec(`
        ANALYZE;
      `);
    },
  },
  {
    id: '009_phase10_final_database_integrity_and_production_review',
    name: 'Final database integrity review: Do Not Contact support, constraints audit, composite indexes, and data cleanup',
    up: (db: DatabaseSync) => {
      // 1. Upgrade contacts schema to support 'Do Not Contact' status safely
      const contactsTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='contacts'").get() as { sql: string } | undefined;
      if (contactsTableSql && !contactsTableSql.sql.includes('Do Not Contact')) {
        db.exec(`
          PRAGMA foreign_keys = OFF;
          CREATE TABLE contacts_p10_upgrade (
            id TEXT PRIMARY KEY,
            company_id TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            title TEXT,
            department TEXT,
            decision_maker INTEGER NOT NULL DEFAULT 0 CHECK (decision_maker IN (0, 1)),
            linkedin_url TEXT,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Contacted', 'Qualified', 'Unresponsive', 'Do Not Contact', 'Archived')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
          );

          INSERT INTO contacts_p10_upgrade (id, company_id, name, email, phone, title, department, decision_maker, linkedin_url, notes, status, created_at, updated_at)
          SELECT id, company_id, name, email, phone, title, department, decision_maker, linkedin_url, notes, status, created_at, updated_at FROM contacts;

          DROP TABLE contacts;
          ALTER TABLE contacts_p10_upgrade RENAME TO contacts;

          CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
          CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
          CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
          CREATE INDEX IF NOT EXISTS idx_contacts_title ON contacts(title);
          CREATE INDEX IF NOT EXISTS idx_contacts_decision_maker ON contacts(decision_maker);
          CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
          CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
          CREATE INDEX IF NOT EXISTS idx_contacts_search_opt ON contacts(status, decision_maker, company_id);
          CREATE INDEX IF NOT EXISTS idx_contacts_status_dm ON contacts(status, decision_maker);

          PRAGMA foreign_keys = ON;
        `);
      }

      // 2. Data hygiene & null constraints audit
      // Ensure all Won leads have won_at set
      db.exec(`
        UPDATE leads
        SET won_at = COALESCE(won_at, stage_changed_at, updated_at, datetime('now'))
        WHERE status = 'Won' AND won_at IS NULL;
      `);

      // Ensure all Lost leads have lost_at and lost_reason set
      db.exec(`
        UPDATE leads
        SET lost_at = COALESCE(lost_at, stage_changed_at, updated_at, datetime('now')),
            lost_reason = COALESCE(lost_reason, 'Unspecified / Closed during discovery')
        WHERE status = 'Lost' AND (lost_at IS NULL OR lost_reason IS NULL OR TRIM(lost_reason) = '');
      `);

      // Ensure all Completed follow-ups have completed_at set
      db.exec(`
        UPDATE follow_ups
        SET completed_at = COALESCE(completed_at, updated_at, datetime('now'))
        WHERE status = 'Completed' AND completed_at IS NULL;
      `);

      // 3. Composite & Performance Indexes for High-Velocity Production Queries
      db.exec(`
        -- Stage history audit trail indexing
        CREATE INDEX IF NOT EXISTS idx_lead_history_lead_created ON lead_stage_history(lead_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_lead_history_to_stage ON lead_stage_history(to_stage);

        -- Activities query optimization
        CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, activity_date);
        CREATE INDEX IF NOT EXISTS idx_activities_lead_date ON activities(lead_id, activity_date);

        -- Campaigns & outreach templates composite indexes
        CREATE INDEX IF NOT EXISTS idx_campaigns_status_product ON campaigns(status, product);
        CREATE INDEX IF NOT EXISTS idx_templates_product_status ON outreach_templates(product, status);

        -- Leads source and campaign performance indexes
        CREATE INDEX IF NOT EXISTS idx_leads_source_status ON leads(source, status);
        CREATE INDEX IF NOT EXISTS idx_leads_campaign_status ON leads(campaign_id, status);

        -- Weekly targets date and user filtering
        CREATE INDEX IF NOT EXISTS idx_weekly_targets_user_dates ON weekly_targets(user_id, start_date, end_date);
      `);

      // 4. Duplicate Prevention Constraints for Weekly Targets
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_targets_unique_user
        ON weekly_targets(target_type, start_date, end_date, user_id)
        WHERE user_id IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_targets_unique_global
        ON weekly_targets(target_type, start_date, end_date)
        WHERE user_id IS NULL;
      `);

      // 5. Query planner optimization
      db.exec(`ANALYZE;`);
    },
  },
  {
    id: '010_create_discovery_leads_tables',
    name: 'Create discovery_jobs and discovered_leads tables for automated discovery workflow',
    up: (db: DatabaseSync) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS discovery_jobs (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          location TEXT NOT NULL,
          max_results INTEGER NOT NULL DEFAULT 10,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'discovering', 'enriching', 'completed', 'failed', 'partial')),
          progress_percent INTEGER NOT NULL DEFAULT 0,
          progress_message TEXT,
          discovered_count INTEGER NOT NULL DEFAULT 0,
          enriched_count INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_discovery_jobs_created_at ON discovery_jobs(created_at);
        CREATE INDEX IF NOT EXISTS idx_discovery_jobs_status ON discovery_jobs(status);

        CREATE TABLE IF NOT EXISTS discovered_leads (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL,
          company_name TEXT NOT NULL,
          normalized_name TEXT NOT NULL,
          category TEXT NOT NULL,
          location TEXT NOT NULL,
          website TEXT NOT NULL,
          domain TEXT NOT NULL,
          emails TEXT,
          phones TEXT,
          address TEXT,
          address_source_url TEXT,
          source_urls TEXT,
          extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'completed', 'no_contacts', 'website_unavailable', 'failed')),
          extraction_error TEXT,
          saved_to_crm INTEGER NOT NULL DEFAULT 0 CHECK (saved_to_crm IN (0, 1)),
          saved_company_id TEXT,
          saved_lead_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (job_id) REFERENCES discovery_jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (saved_company_id) REFERENCES companies(id) ON DELETE SET NULL,
          FOREIGN KEY (saved_lead_id) REFERENCES leads(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_discovered_leads_job_id ON discovered_leads(job_id);
        CREATE INDEX IF NOT EXISTS idx_discovered_leads_domain ON discovered_leads(domain);
        CREATE INDEX IF NOT EXISTS idx_discovered_leads_status ON discovered_leads(extraction_status);
        CREATE INDEX IF NOT EXISTS idx_discovered_leads_saved ON discovered_leads(saved_to_crm);
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
  // Seed Contacts with target roles: Recruitment Heads, Talent Acquisition, HR Heads, CEOs, Founders, Finance, IT Heads
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
      notes: 'Key technical buyer evaluating migration timeline and Kubernetes clusters.',
      status: 'Active',
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
      notes: 'Leading high-volume tech hiring. Interested in automated candidate outreach and screening.',
      status: 'Active',
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
      notes: 'Strict compliance focus (SOC2, PCI). Needs security reviews prior to procurement.',
      status: 'Active',
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
      notes: 'Champion for cloud modernization and HIPAA compliant integrations.',
      status: 'Active',
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
      notes: 'Manages AWS infrastructure budget. Prioritizes scalable uptime and multi-region failover.',
      status: 'Active',
    },
    {
      id: 'cnt_006',
      company_id: 'cmp_techcorp_01',
      name: 'Jonathan Vance',
      email: 'j.vance@techcorp.io',
      phone: '+1 (415) 555-0101',
      title: 'Chief Executive Officer & Founder',
      department: 'Executive',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/jonathan-vance-ceo',
      notes: 'Founder and ultimate decision maker for major vendor commitments >$50k.',
      status: 'Active',
    },
    {
      id: 'cnt_007',
      company_id: 'cmp_finpulse_02',
      name: 'Sophia Martinez',
      email: 's.martinez@finpulse.com',
      phone: '+1 (212) 555-0211',
      title: 'Chief People Officer & HR Head',
      department: 'Human Resources',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/sophia-martinez-cpo',
      notes: 'Overseeing global HR operations, employee retention, and talent acquisition tooling.',
      status: 'Active',
    },
    {
      id: 'cnt_008',
      company_id: 'cmp_nexus_03',
      name: 'David Cho',
      email: 'dcho@nexushealth.org',
      phone: '+1 (617) 555-0177',
      title: 'Senior Talent Acquisition Manager',
      department: 'Human Resources',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/david-cho-recruiting',
      notes: 'Hiring clinical and engineering staff. Needs rapid pipeline expansion.',
      status: 'Active',
    },
    {
      id: 'cnt_009',
      company_id: 'cmp_velocix_04',
      name: 'Priya Sharma',
      email: 'priya.s@velocix.net',
      phone: '+1 (312) 555-0145',
      title: 'Global Head of Recruitment',
      department: 'Human Resources',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/priya-sharma-talent',
      notes: 'Scaling IoT fleet engineers and operations team across North America.',
      status: 'Active',
    },
    {
      id: 'cnt_010',
      company_id: 'cmp_apex_05',
      name: 'Rachel Adams',
      email: 'r.adams@apexretail.com',
      phone: '+1 (512) 555-0199',
      title: 'VP of Finance & Payroll Operations',
      department: 'Finance',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/rachel-adams-cfo',
      notes: 'Responsible for department budget approvals, payroll systems, and ROI validation.',
      status: 'Active',
    },
    {
      id: 'cnt_011',
      company_id: 'cmp_zenith_06',
      name: 'Daniel Wu',
      email: 'daniel@zenithai.tech',
      phone: '+1 (206) 555-0182',
      title: 'Founder & Head of AI Infrastructure',
      department: 'Engineering',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/daniel-wu-ai',
      notes: 'Technical co-founder evaluating GPU clusters and cloud pipeline automation.',
      status: 'Active',
    },
    {
      id: 'cnt_012',
      company_id: 'cmp_zenith_06',
      name: 'Arthur Pendelton',
      email: 'a.pendelton@zenithai.tech',
      phone: '+1 (206) 555-0199',
      title: 'VP of Procurement',
      department: 'Procurement',
      decision_maker: 1,
      linkedin_url: 'https://linkedin.com/in/arthur-pendelton',
      notes: 'Requested no further contact until next fiscal year budget review.',
      status: 'Do Not Contact',
    },
  ];

  const insertContactStmt = db.prepare(`
    INSERT INTO contacts (id, company_id, name, email, phone, title, department, decision_maker, linkedin_url, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      phone = excluded.phone,
      title = excluded.title,
      department = excluded.department,
      decision_maker = excluded.decision_maker,
      linkedin_url = excluded.linkedin_url,
      notes = excluded.notes,
      status = excluded.status,
      updated_at = datetime('now')
  `);

  for (const cnt of seedContacts) {
    insertContactStmt.run(
      cnt.id, cnt.company_id, cnt.name, cnt.email, cnt.phone,
      cnt.title, cnt.department, cnt.decision_maker, cnt.linkedin_url,
      cnt.notes, cnt.status
    );
  }

  // Seed Leads with contact references (Company → Contacts → Lead relationship) & Qualification Signals
  const seedLeads = [
    {
      id: 'ld_001',
      company_id: 'cmp_techcorp_01',
      contact_id: 'cnt_001',
      product: 'Both',
      title: 'Enterprise Multi-Cloud Infrastructure Security',
      value: 65000,
      status: 'Demo Booked',
      priority: 'High',
      hiring_volume: 'High',
      hiring_multiple_roles: 1,
      manual_hr_processes: 1,
      existing_tools: 'Workday, Jira, AWS, Datadog',
      company_size: '201-500',
      decision_maker_identified: 1,
      qualification_score: 95,
      qualification_notes: 'Strong hiring volume (12+ cloud architects), manual screening bottlenecks, verified VP of Engineering buyer.',
      notes: 'Key technical buyer evaluating migration timeline and assessment capabilities.',
      source: 'IT Mapping Outreach',
      assigned_to: 'usr_sales_001',
    },
    {
      id: 'ld_002',
      company_id: 'cmp_finpulse_02',
      contact_id: 'cnt_003',
      product: 'HRMS Portal',
      title: 'High-Frequency FinTech Data Pipeline Migration',
      value: 95000,
      status: 'New',
      priority: 'High',
      hiring_volume: 'High',
      hiring_multiple_roles: 1,
      manual_hr_processes: 1,
      existing_tools: 'BambooHR, Lever, Bloomberg Terminal',
      company_size: '501-1000',
      decision_maker_identified: 1,
      qualification_score: 88,
      qualification_notes: 'High-volume data engineering hiring and manual onboarding issues in regulated financial trading.',
      notes: 'Strict compliance focus (SOC2, PCI). CISO verified as key security gatekeeper.',
      source: 'Direct Sourced',
      assigned_to: 'usr_sales_001',
    },
    {
      id: 'ld_003',
      company_id: 'cmp_apex_05',
      contact_id: 'cnt_005',
      product: 'Higher IQ',
      title: 'Omnichannel Cloud Scale Expansion',
      value: 48000,
      status: 'Won',
      priority: 'High',
      hiring_volume: 'Medium',
      hiring_multiple_roles: 1,
      manual_hr_processes: 0,
      existing_tools: 'Gusto, Greenhouse, Stripe',
      company_size: '201-500',
      decision_maker_identified: 1,
      qualification_score: 82,
      qualification_notes: 'Evaluating automated coding and system architecture assessments for 6 frontend hires.',
      notes: 'Won multi-year cloud contract; onboarding candidates via automated screening.',
      source: 'Referral',
      assigned_to: 'usr_manager_001',
    },
    {
      id: 'ld_004',
      company_id: 'cmp_techcorp_01',
      contact_id: 'cnt_002',
      product: 'Higher IQ',
      title: 'AI-Powered Technical Recruitment Pipeline',
      value: 38000,
      status: 'Demo Done',
      priority: 'High',
      hiring_volume: 'High',
      hiring_multiple_roles: 1,
      manual_hr_processes: 1,
      existing_tools: 'Workday, Greenhouse',
      company_size: '201-500',
      decision_maker_identified: 1,
      qualification_score: 92,
      qualification_notes: 'Elena Rostova actively sourcing cloud architects. Wants Higher IQ for automated interviewing.',
      notes: 'Pilot approved; contract sent for legal review.',
      source: 'HR Executive Networking',
      assigned_to: 'usr_sales_001',
    },
    {
      id: 'ld_005',
      company_id: 'cmp_apex_05',
      contact_id: 'cnt_010',
      product: 'HRMS Portal',
      title: 'ERP Payroll & Billing Consolidation',
      value: 52000,
      status: 'Contacted',
      priority: 'Medium',
      hiring_volume: 'Medium',
      hiring_multiple_roles: 0,
      manual_hr_processes: 1,
      existing_tools: 'Gusto, Excel',
      company_size: '201-500',
      decision_maker_identified: 1,
      qualification_score: 68,
      qualification_notes: 'VP of Finance seeking unified payroll with employee self-service to replace fragmented Gusto + spreadsheets.',
      notes: 'Demo delivered; ROI calculation model submitted.',
      source: 'Finance Outreach',
      assigned_to: 'usr_sales_001',
    },
    {
      id: 'ld_006',
      company_id: 'cmp_nexus_03',
      contact_id: 'cnt_004',
      product: 'Both',
      title: 'HIPAA Cloud Compliance & Zero-Trust Architecture',
      value: 82000,
      status: 'Replied',
      priority: 'High',
      hiring_volume: 'High',
      hiring_multiple_roles: 1,
      manual_hr_processes: 1,
      existing_tools: 'Workday, Taleo, Epic Systems',
      company_size: '1000-5000',
      decision_maker_identified: 1,
      qualification_score: 90,
      qualification_notes: 'Hospital system hiring 20+ IT personnel, heavily manual compliance checks. Need both assessment and core compliance HRMS.',
      notes: 'CTO Dr. Aris Thorne confirmed budget allocation for Q4.',
      source: 'CTO Referral',
      assigned_to: 'usr_admin_001',
    },
  ];

  const insertLeadStmt = db.prepare(`
    INSERT INTO leads (
      id, company_id, contact_id, product, title, value, status, priority,
      hiring_volume, hiring_multiple_roles, manual_hr_processes, existing_tools,
      company_size, decision_maker_identified, qualification_score, qualification_notes, notes,
      source, assigned_to, won_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      company_id = excluded.company_id,
      contact_id = excluded.contact_id,
      product = excluded.product,
      title = excluded.title,
      value = excluded.value,
      status = excluded.status,
      priority = excluded.priority,
      hiring_volume = excluded.hiring_volume,
      hiring_multiple_roles = excluded.hiring_multiple_roles,
      manual_hr_processes = excluded.manual_hr_processes,
      existing_tools = excluded.existing_tools,
      company_size = excluded.company_size,
      decision_maker_identified = excluded.decision_maker_identified,
      qualification_score = excluded.qualification_score,
      qualification_notes = excluded.qualification_notes,
      notes = excluded.notes,
      source = excluded.source,
      assigned_to = excluded.assigned_to,
      won_at = excluded.won_at,
      updated_at = datetime('now')
  `);

  for (const ld of seedLeads) {
    const wonAt = ld.status === 'Won' ? new Date().toISOString() : null;
    insertLeadStmt.run(
      ld.id, ld.company_id, ld.contact_id, ld.product, ld.title, ld.value,
      ld.status, ld.priority, ld.hiring_volume, ld.hiring_multiple_roles,
      ld.manual_hr_processes, ld.existing_tools, ld.company_size,
      ld.decision_maker_identified, ld.qualification_score, ld.qualification_notes,
      ld.notes, ld.source, ld.assigned_to, wonAt
    );

    // Seed initial stage history entry if table exists and no history yet
    try {
      const existingHistory = db.prepare('SELECT COUNT(*) as count FROM lead_stage_history WHERE lead_id = ?').get(ld.id) as { count: number };
      if (!existingHistory || existingHistory.count === 0) {
        db.prepare(`
          INSERT INTO lead_stage_history (id, lead_id, from_stage, to_stage, changed_by, notes, created_at)
          VALUES (?, ?, NULL, ?, ?, ?, datetime('now'))
        `).run(`hist_seed_${ld.id}`, ld.id, ld.status, ld.assigned_to, 'Initial lead stage assigned upon outreach discovery.');
      }
    } catch {
      // Table might not exist yet during initial dry migration runs
    }
  }

  // Seed Outreach Activities and Follow-ups
  try {
    const now = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const todayStr = formatYMD(now);
    const twoDaysAgo = formatYMD(new Date(now.getTime() - 2 * 86400000));
    const fiveDaysAgo = formatYMD(new Date(now.getTime() - 5 * 86400000));
    const threeDaysLater = formatYMD(new Date(now.getTime() + 3 * 86400000));
    const tenDaysLater = formatYMD(new Date(now.getTime() + 10 * 86400000));

    const insertActivityStmt = db.prepare(`
      INSERT INTO activities (id, lead_id, user_id, type, subject, notes, activity_date, cadence_day, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        subject = excluded.subject,
        notes = excluded.notes,
        activity_date = excluded.activity_date,
        cadence_day = excluded.cadence_day,
        updated_at = datetime('now')
    `);

    const seedActivities = [
      {
        id: 'act_001',
        lead_id: 'ld_001',
        user_id: 'usr_sales_001',
        type: 'Email',
        subject: 'Day 1: Modernizing IT Staffing & Cloud Assessment',
        notes: 'Sent personalized outreach email to Elena Rostova detailing Higher IQ cloud assessment capabilities.',
        activity_date: `${fiveDaysAgo}T09:30:00Z`,
        cadence_day: 1,
      },
      {
        id: 'act_002',
        lead_id: 'ld_001',
        user_id: 'usr_sales_001',
        type: 'LinkedIn',
        subject: 'Day 3: LinkedIn Connection with Elena',
        notes: 'Sent LinkedIn connection request referencing Tuesday email regarding AWS architect screening bottlenecks.',
        activity_date: `${twoDaysAgo}T14:15:00Z`,
        cadence_day: 3,
      },
      {
        id: 'act_003',
        lead_id: 'ld_002',
        user_id: 'usr_sales_001',
        type: 'Email',
        subject: 'Day 1: FinPulse HRMS Compliance Optimization',
        notes: 'Initial email sent to Marcus Vance regarding automated employee onboarding and SOC2 compliance.',
        activity_date: `${fiveDaysAgo}T11:00:00Z`,
        cadence_day: 1,
      },
      {
        id: 'act_004',
        lead_id: 'ld_003',
        user_id: 'usr_sales_001',
        type: 'Phone',
        subject: 'Day 6: Alignment Discovery Call',
        notes: 'Quick discovery call with Priya Sharma regarding high hiring volume in Q4 and manual screening.',
        activity_date: `${todayStr}T10:00:00Z`,
        cadence_day: 6,
      },
    ];

    for (const act of seedActivities) {
      insertActivityStmt.run(act.id, act.lead_id, act.user_id, act.type, act.subject, act.notes, act.activity_date, act.cadence_day);
    }

    const insertFollowUpStmt = db.prepare(`
      INSERT INTO follow_ups (
        id, lead_id, activity_id, user_id, title, type, due_date, status, notes,
        cadence_day, completed_at, completed_by, rescheduled_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        type = excluded.type,
        due_date = excluded.due_date,
        status = excluded.status,
        notes = excluded.notes,
        cadence_day = excluded.cadence_day,
        completed_at = excluded.completed_at,
        completed_by = excluded.completed_by,
        rescheduled_count = excluded.rescheduled_count,
        updated_at = datetime('now')
    `);

    const seedFollowUps = [
      {
        id: 'flw_001',
        lead_id: 'ld_001',
        activity_id: 'act_002',
        user_id: 'usr_sales_001',
        title: 'Day 6: Alignment Discovery Call',
        type: 'Phone',
        due_date: todayStr,
        status: 'Pending',
        notes: 'Call Elena Rostova to discuss cloud assessment demo.',
        cadence_day: 6,
        completed_at: null,
        completed_by: null,
        rescheduled_count: 0,
      },
      {
        id: 'flw_002',
        lead_id: 'ld_002',
        activity_id: 'act_003',
        user_id: 'usr_sales_001',
        title: 'Day 3: LinkedIn Connection & Note',
        type: 'LinkedIn',
        due_date: twoDaysAgo,
        status: 'Pending',
        notes: 'Follow up on LinkedIn if email remains unopened.',
        cadence_day: 3,
        completed_at: null,
        completed_by: null,
        rescheduled_count: 0,
      },
      {
        id: 'flw_003',
        lead_id: 'ld_003',
        activity_id: 'act_004',
        user_id: 'usr_sales_001',
        title: 'Day 10: Value Case Study Email',
        type: 'Email',
        due_date: threeDaysLater,
        status: 'Pending',
        notes: 'Send retail sector engineering recruitment case study.',
        cadence_day: 10,
        completed_at: null,
        completed_by: null,
        rescheduled_count: 0,
      },
      {
        id: 'flw_004',
        lead_id: 'ld_006',
        activity_id: null,
        user_id: 'usr_admin_001',
        title: 'Day 15: Final Follow-up / Break-up Note',
        type: 'Email',
        due_date: tenDaysLater,
        status: 'Pending',
        notes: 'Final note to CTO Dr. Aris Thorne before closing pipeline cycle.',
        cadence_day: 15,
        completed_at: null,
        completed_by: null,
        rescheduled_count: 0,
      },
      {
        id: 'flw_005',
        lead_id: 'ld_001',
        activity_id: 'act_001',
        user_id: 'usr_sales_001',
        title: 'Day 1: Send Initial Value Pitch',
        type: 'Email',
        due_date: fiveDaysAgo,
        status: 'Completed',
        notes: 'Delivered pitch deck successfully.',
        cadence_day: 1,
        completed_at: `${fiveDaysAgo}T16:00:00Z`,
        completed_by: 'usr_sales_001',
        rescheduled_count: 0,
      },
    ];

    for (const flw of seedFollowUps) {
      insertFollowUpStmt.run(
        flw.id, flw.lead_id, flw.activity_id, flw.user_id, flw.title,
        flw.type, flw.due_date, flw.status, flw.notes, flw.cadence_day,
        flw.completed_at, flw.completed_by, flw.rescheduled_count
      );
    }
  } catch (err) {
    console.error('Error seeding activities and follow-ups:', err);
  }
}
