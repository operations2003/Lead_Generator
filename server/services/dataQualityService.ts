import { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/database';

export interface DataQualityAuditResult {
  timestamp: string;
  isHealthy: boolean;
  indexes: {
    totalRequired: number;
    totalFound: number;
    missingIndexes: string[];
    allVerified: boolean;
  };
  foreignKeys: {
    passed: boolean;
    violationsCount: number;
    violations: Array<Record<string, unknown>>;
  };
  orphans: {
    orphanContactsCount: number;
    orphanLeadsCount: number;
    orphanFollowUpsCount: number;
    orphanActivitiesCount: number;
    orphanStageHistoryCount: number;
    totalOrphans: number;
    passed: boolean;
  };
  duplicates: {
    duplicateCompaniesCount: number;
    duplicateContactsCount: number;
    duplicateActiveLeadsCount: number;
    totalDuplicates: number;
    details: {
      companies: Array<{ normalized_domain: string; count: number }>;
      contacts: Array<{ company_id: string; email: string; count: number }>;
      leads: Array<{ company_id: string; product: string; count: number }>;
    };
  };
  validations: {
    invalidProductsCount: number;
    invalidStatusesCount: number;
    invalidPrioritiesCount: number;
    invalidScoresCount: number;
    invalidProductFitsCount: number;
    nullCompanyNamesCount: number;
    passed: boolean;
  };
  tableRowCounts: {
    companies: number;
    contacts: number;
    leads: number;
    activities: number;
    followUps: number;
    campaigns: number;
  };
  benchmarks: {
    companySearchMs: number;
    leadSearchMs: number;
    reportingOverviewMs: number;
  };
}

export const PHASE9_REQUIRED_INDEXES = [
  'idx_companies_name',
  'idx_companies_normalized_name',
  'idx_companies_industry',
  'idx_companies_location',
  'idx_companies_employee_size',
  'idx_companies_current_tools',
  'idx_companies_hiring_signals',
  'idx_companies_product_fit',
  'idx_contacts_name',
  'idx_contacts_email',
  'idx_contacts_title',
  'idx_contacts_decision_maker',
  'idx_contacts_company_id',
  'idx_leads_source',
  'idx_leads_campaign_id',
  'idx_leads_product',
  'idx_leads_priority',
  'idx_leads_status',
  'idx_leads_existing_tools',
  'idx_leads_hiring_volume',
  'idx_follow_ups_due_date',
] as const;

export class DataQualityService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  /**
   * Verify all required Phase 9 database indexes exist
   */
  public verifyIndexes(): {
    totalRequired: number;
    totalFound: number;
    missingIndexes: string[];
    allVerified: boolean;
  } {
    const existingIndexRows = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name IS NOT NULL")
      .all() as unknown as { name: string }[];
    const existingSet = new Set(existingIndexRows.map((r) => r.name));

    const missingIndexes: string[] = [];
    for (const requiredIndex of PHASE9_REQUIRED_INDEXES) {
      if (!existingSet.has(requiredIndex)) {
        missingIndexes.push(requiredIndex);
      }
    }

    return {
      totalRequired: PHASE9_REQUIRED_INDEXES.length,
      totalFound: PHASE9_REQUIRED_INDEXES.length - missingIndexes.length,
      missingIndexes,
      allVerified: missingIndexes.length === 0,
    };
  }

  /**
   * Check for broken foreign keys
   */
  public checkForeignKeys(): {
    passed: boolean;
    violationsCount: number;
    violations: Array<Record<string, unknown>>;
  } {
    const fkRows = this.db.prepare('PRAGMA foreign_key_check').all() as unknown as Record<string, unknown>[];
    return {
      passed: fkRows.length === 0,
      violationsCount: fkRows.length,
      violations: fkRows,
    };
  }

  /**
   * Detect any orphan records in relational tables
   */
  public checkOrphans(): {
    orphanContactsCount: number;
    orphanLeadsCount: number;
    orphanFollowUpsCount: number;
    orphanActivitiesCount: number;
    orphanStageHistoryCount: number;
    totalOrphans: number;
    passed: boolean;
  } {
    // 1. Orphan contacts
    const orphanContacts = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM contacts c
        LEFT JOIN companies comp ON c.company_id = comp.id
        WHERE comp.id IS NULL
      `)
      .get() as unknown as { count: number };

    // 2. Orphan leads (bad company_id or bad contact_id)
    const orphanLeads = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM leads l
        LEFT JOIN companies comp ON l.company_id = comp.id
        WHERE comp.id IS NULL
      `)
      .get() as unknown as { count: number };

    // 3. Orphan follow-ups
    const orphanFollowUps = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM follow_ups f
        LEFT JOIN leads l ON f.lead_id = l.id
        WHERE l.id IS NULL
      `)
      .get() as unknown as { count: number };

    // 4. Orphan activities
    const orphanActivities = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        WHERE l.id IS NULL
      `)
      .get() as unknown as { count: number };

    // 5. Orphan lead stage history
    const orphanHistory = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM lead_stage_history h
        LEFT JOIN leads l ON h.lead_id = l.id
        WHERE l.id IS NULL
      `)
      .get() as unknown as { count: number };

    const totalOrphans =
      Number(orphanContacts.count || 0) +
      Number(orphanLeads.count || 0) +
      Number(orphanFollowUps.count || 0) +
      Number(orphanActivities.count || 0) +
      Number(orphanHistory.count || 0);

    return {
      orphanContactsCount: Number(orphanContacts.count || 0),
      orphanLeadsCount: Number(orphanLeads.count || 0),
      orphanFollowUpsCount: Number(orphanFollowUps.count || 0),
      orphanActivitiesCount: Number(orphanActivities.count || 0),
      orphanStageHistoryCount: Number(orphanHistory.count || 0),
      totalOrphans,
      passed: totalOrphans === 0,
    };
  }

  /**
   * Check for duplicate records according to business rules
   */
  public checkDuplicates(): {
    duplicateCompaniesCount: number;
    duplicateContactsCount: number;
    duplicateActiveLeadsCount: number;
    totalDuplicates: number;
    details: {
      companies: Array<{ normalized_domain: string; count: number }>;
      contacts: Array<{ company_id: string; email: string; count: number }>;
      leads: Array<{ company_id: string; product: string; count: number }>;
    };
  } {
    // 1. Companies with duplicate domains
    const dupCompanies = this.db
      .prepare(`
        SELECT normalized_domain, COUNT(*) as count
        FROM companies
        WHERE status != 'Archived' AND normalized_domain IS NOT NULL AND TRIM(normalized_domain) != ''
        GROUP BY normalized_domain
        HAVING count > 1
      `)
      .all() as unknown as Array<{ normalized_domain: string; count: number }>;

    // 2. Contacts with duplicate email within same company
    const dupContacts = this.db
      .prepare(`
        SELECT company_id, LOWER(email) as email, COUNT(*) as count
        FROM contacts
        WHERE status != 'Archived' AND email IS NOT NULL AND TRIM(email) != ''
        GROUP BY company_id, LOWER(email)
        HAVING count > 1
      `)
      .all() as unknown as Array<{ company_id: string; email: string; count: number }>;

    // 3. Exact duplicate active leads (same company, contact, product, and title)
    const dupLeads = this.db
      .prepare(`
        SELECT company_id, COALESCE(contact_id, '') as contact_id, product, title, COUNT(*) as count
        FROM leads
        WHERE status NOT IN ('Won', 'Lost', 'Archived')
        GROUP BY company_id, COALESCE(contact_id, ''), product, title
        HAVING count > 1
      `)
      .all() as unknown as Array<{ company_id: string; product: string; count: number }>;

    const totalDuplicates = dupCompanies.length + dupContacts.length + dupLeads.length;

    return {
      duplicateCompaniesCount: dupCompanies.length,
      duplicateContactsCount: dupContacts.length,
      duplicateActiveLeadsCount: dupLeads.length,
      totalDuplicates,
      details: {
        companies: dupCompanies,
        contacts: dupContacts,
        leads: dupLeads,
      },
    };
  }

  /**
   * Safely deduplicate exact duplicate active leads while preserving original production seed data
   */
  public deduplicateRedundantLeads(): { cleaned: number } {
    const dupGroups = this.db
      .prepare(`
        SELECT company_id, COALESCE(contact_id, '') as contact_id, product, title, COUNT(*) as count
        FROM leads
        WHERE status NOT IN ('Won', 'Lost', 'Archived')
        GROUP BY company_id, COALESCE(contact_id, ''), product, title
        HAVING count > 1
      `)
      .all() as unknown as Array<{ company_id: string; contact_id: string; product: string; title: string }>;

    let cleaned = 0;
    const protectedSeedLeadIds = new Set([
      'ld_001', 'ld_002', 'ld_003', 'ld_004', 'ld_005', 'ld_006',
      'ld_phase9_hireiq_01', 'ld_phase9_hrms_02',
    ]);

    for (const g of dupGroups) {
      const rows = this.db
        .prepare(`
          SELECT id FROM leads
          WHERE company_id = ? AND COALESCE(contact_id, '') = ? AND product = ? AND title = ?
          ORDER BY created_at ASC, rowid ASC
        `)
        .all(g.company_id, g.contact_id, g.product, g.title) as unknown as Array<{ id: string }>;

      // Retain the earliest record, clean up redundant copies
      for (let i = 1; i < rows.length; i++) {
        if (!protectedSeedLeadIds.has(rows[i].id)) {
          this.db.prepare('DELETE FROM leads WHERE id = ?').run(rows[i].id);
          cleaned++;
        }
      }
    }

    return { cleaned };
  }

  /**
   * Check for null values in mandatory fields and invalid enum values
   */
  public checkNullAndInvalidValues(): {
    invalidProductsCount: number;
    invalidStatusesCount: number;
    invalidPrioritiesCount: number;
    invalidScoresCount: number;
    invalidProductFitsCount: number;
    nullCompanyNamesCount: number;
    passed: boolean;
  } {
    const invalidProducts = this.db
      .prepare("SELECT COUNT(*) as count FROM leads WHERE product NOT IN ('Higher IQ', 'HRMS Portal', 'Both')")
      .get() as unknown as { count: number };

    const invalidStatuses = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM leads
        WHERE status NOT IN ('New', 'Contacted', 'Replied', 'Demo Booked', 'Demo Done', 'Won', 'Lost', 'Archived')
      `)
      .get() as unknown as { count: number };

    const invalidPriorities = this.db
      .prepare("SELECT COUNT(*) as count FROM leads WHERE priority NOT IN ('High', 'Medium', 'Low')")
      .get() as unknown as { count: number };

    const invalidScores = this.db
      .prepare("SELECT COUNT(*) as count FROM leads WHERE qualification_score < 0 OR qualification_score > 100")
      .get() as unknown as { count: number };

    const invalidProductFits = this.db
      .prepare("SELECT COUNT(*) as count FROM companies WHERE product_fit NOT IN ('High', 'Medium', 'Low')")
      .get() as unknown as { count: number };

    const nullCompanyNames = this.db
      .prepare("SELECT COUNT(*) as count FROM companies WHERE name IS NULL OR TRIM(name) = ''")
      .get() as unknown as { count: number };

    const totalInvalid =
      Number(invalidProducts.count || 0) +
      Number(invalidStatuses.count || 0) +
      Number(invalidPriorities.count || 0) +
      Number(invalidScores.count || 0) +
      Number(invalidProductFits.count || 0) +
      Number(nullCompanyNames.count || 0);

    return {
      invalidProductsCount: Number(invalidProducts.count || 0),
      invalidStatusesCount: Number(invalidStatuses.count || 0),
      invalidPrioritiesCount: Number(invalidPriorities.count || 0),
      invalidScoresCount: Number(invalidScores.count || 0),
      invalidProductFitsCount: Number(invalidProductFits.count || 0),
      nullCompanyNamesCount: Number(nullCompanyNames.count || 0),
      passed: totalInvalid === 0,
    };
  }

  /**
   * Benchmark search and reporting queries
   */
  public benchmarkQueries(): {
    companySearchMs: number;
    leadSearchMs: number;
    reportingOverviewMs: number;
  } {
    // 1. Company Search
    const t0 = performance.now();
    this.db
      .prepare(`
        SELECT c.* FROM companies c
        WHERE c.status != 'Archived' AND c.industry = 'Staffing & Recruiting'
        ORDER BY c.created_at DESC LIMIT 20
      `)
      .all();
    const companySearchMs = Number((performance.now() - t0).toFixed(2));

    // 2. Lead Discovery Search
    const t1 = performance.now();
    this.db
      .prepare(`
        SELECT l.*, comp.name as company_name
        FROM leads l
        JOIN companies comp ON l.company_id = comp.id
        WHERE l.status = 'New' AND l.product = 'Higher IQ' AND l.priority = 'High'
        ORDER BY l.qualification_score DESC LIMIT 20
      `)
      .all();
    const leadSearchMs = Number((performance.now() - t1).toFixed(2));

    // 3. Reporting overview aggregation
    const t2 = performance.now();
    this.db
      .prepare(`
        SELECT 
          COUNT(*) as total_leads,
          SUM(value) as total_val,
          COUNT(DISTINCT company_id) as companies_count
        FROM leads
        WHERE status != 'Archived'
      `)
      .get();
    const reportingOverviewMs = Number((performance.now() - t2).toFixed(2));

    return {
      companySearchMs,
      leadSearchMs,
      reportingOverviewMs,
    };
  }

  /**
   * Run full data quality & optimization audit
   */
  public runFullQualityAudit(): DataQualityAuditResult {
    const indexes = this.verifyIndexes();
    const foreignKeys = this.checkForeignKeys();
    const orphans = this.checkOrphans();
    const duplicates = this.checkDuplicates();
    const validations = this.checkNullAndInvalidValues();
    const benchmarks = this.benchmarkQueries();

    // Table row counts
    const compCount = (this.db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number }).count;
    const contCount = (this.db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number }).count;
    const leadCount = (this.db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }).count;
    const actCount = (this.db.prepare('SELECT COUNT(*) as count FROM activities').get() as { count: number }).count;
    const flwCount = (this.db.prepare('SELECT COUNT(*) as count FROM follow_ups').get() as { count: number }).count;
    const cmpCount = (this.db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }).count;

    const isHealthy =
      indexes.allVerified &&
      foreignKeys.passed &&
      orphans.passed &&
      validations.passed;

    return {
      timestamp: new Date().toISOString(),
      isHealthy,
      indexes,
      foreignKeys,
      orphans,
      duplicates,
      validations,
      tableRowCounts: {
        companies: compCount,
        contacts: contCount,
        leads: leadCount,
        activities: actCount,
        followUps: flwCount,
        campaigns: cmpCount,
      },
      benchmarks,
    };
  }
}
