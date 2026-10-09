import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { getDb } from '../db/database';
import {
  companyDiscoveryEngine,
  DiscoverySearchCriteria,
} from './companyDiscoveryEngine';
import {
  websiteEnrichmentEngine,
  EnrichedCompanyLead,
} from './websiteEnrichmentEngine';
import { CompanyService } from './companyService';
import { ContactService } from './contactService';
import { LeadService } from './leadService';
import {
  DiscoveryJobRecord,
  DiscoveredLeadRecord,
  DiscoveredContactEmail,
  DiscoveredContactPhone,
} from '../db/types';

export interface DiscoveryProgressEvent {
  jobId: string;
  stage: 'discovering' | 'enriching' | 'completed' | 'failed';
  percent: number;
  message: string;
  discoveredCount: number;
  enrichedCount: number;
  currentCompany?: string;
  lead?: EnrichedCompanyLead;
}

export class AutoDiscoveryService extends EventEmitter {
  private db: DatabaseSync;
  private companyService: CompanyService;
  private contactService: ContactService;
  private leadService: LeadService;

  constructor(db?: DatabaseSync) {
    super();
    this.db = db || getDb();
    this.companyService = new CompanyService(this.db);
    this.contactService = new ContactService(this.db);
    this.leadService = new LeadService(this.db);
  }

  /**
   * Runs the complete automatic discovery pipeline (Stage A + Stage B).
   */
  public async runDiscovery(
    criteria: DiscoverySearchCriteria,
    userId?: string
  ): Promise<{ job: DiscoveryJobRecord; leads: DiscoveredLeadRecord[] }> {
    const jobId = `job_${crypto.randomUUID().slice(0, 8)}`;
    const maxResults = Math.min(Math.max(criteria.maxResults || 10, 1), 50);

    // 1. Create job record in database
    const insertJobStmt = this.db.prepare(`
      INSERT INTO discovery_jobs (
        id, category, location, max_results, status, progress_percent,
        progress_message, discovered_count, enriched_count, created_by,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'discovering', 5, ?, 0, 0, ?, datetime('now'), datetime('now'))
    `);

    insertJobStmt.run(
      jobId,
      criteria.category,
      criteria.location,
      maxResults,
      `Discovering ${criteria.category} companies in ${criteria.location}...`,
      userId || null
    );

    this.emitProgress({
      jobId,
      stage: 'discovering',
      percent: 10,
      message: `Searching legitimate business registries for "${criteria.category}" in "${criteria.location}"...`,
      discoveredCount: 0,
      enrichedCount: 0,
    });

    try {
      // 2. Stage A: Company Discovery
      const discoveredCandidates = await companyDiscoveryEngine.discoverCompanies(
        {
          category: criteria.category,
          location: criteria.location,
          maxResults,
        },
        (msg, count) => {
          this.updateJobProgress(jobId, Math.min(10 + Math.floor((count / maxResults) * 30), 40), msg, count, 0);
          this.emitProgress({
            jobId,
            stage: 'discovering',
            percent: Math.min(10 + Math.floor((count / maxResults) * 30), 40),
            message: msg,
            discoveredCount: count,
            enrichedCount: 0,
          });
        }
      );

      const discoveredCount = discoveredCandidates.length;

      if (discoveredCount === 0) {
        this.updateJobStatus(jobId, 'completed', 100, 'No companies found matching criteria', 0, 0);
        this.emitProgress({
          jobId,
          stage: 'completed',
          percent: 100,
          message: 'Discovery complete: No companies found for this query.',
          discoveredCount: 0,
          enrichedCount: 0,
        });
        const job = this.getJobById(jobId)!;
        return { job, leads: [] };
      }

      // Update progress to Stage B
      this.updateJobProgress(
        jobId,
        45,
        `Discovered ${discoveredCount} companies. Starting Stage B website contact enrichment...`,
        discoveredCount,
        0
      );

      this.emitProgress({
        jobId,
        stage: 'enriching',
        percent: 45,
        message: `Stage A complete. Now inspecting ${discoveredCount} official company websites for contacts...`,
        discoveredCount,
        enrichedCount: 0,
      });

      // 3. Stage B: Website Contact Enrichment
      const enrichedLeads = await websiteEnrichmentEngine.enrichCompanies(
        discoveredCandidates,
        (compName, index, total, status) => {
          const enrichPercent = 45 + Math.floor((index / total) * 50);
          const msg = `Enriched [${index}/${total}] ${compName} (${status})`;
          this.updateJobProgress(jobId, enrichPercent, msg, discoveredCount, index);
          this.emitProgress({
            jobId,
            stage: 'enriching',
            percent: enrichPercent,
            message: msg,
            discoveredCount,
            enrichedCount: index,
            currentCompany: compName,
          });
        }
      );

      // 4. Save discovered leads to database
      const insertLeadStmt = this.db.prepare(`
        INSERT INTO discovered_leads (
          id, job_id, company_name, normalized_name, category, location,
          website, domain, emails, phones, address, address_source_url,
          source_urls, extraction_status, extraction_error, saved_to_crm,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
      `);

      for (const item of enrichedLeads) {
        const leadId = `dld_${crypto.randomUUID().slice(0, 8)}`;
        insertLeadStmt.run(
          leadId,
          jobId,
          item.companyName,
          item.normalizedName,
          item.category,
          item.location,
          item.website,
          item.domain,
          JSON.stringify(item.emails),
          JSON.stringify(item.phones),
          item.address || null,
          item.addressSourceUrl || null,
          JSON.stringify(item.sourceUrls),
          item.extractionStatus,
          item.extractionError || null
        );
      }

      // 5. Finalize job status
      this.updateJobStatus(
        jobId,
        'completed',
        100,
        `Successfully discovered and enriched ${enrichedLeads.length} companies`,
        discoveredCount,
        enrichedLeads.length
      );

      this.emitProgress({
        jobId,
        stage: 'completed',
        percent: 100,
        message: `Discovery complete! Enriched ${enrichedLeads.length} company leads.`,
        discoveredCount,
        enrichedCount: enrichedLeads.length,
      });

      const job = this.getJobById(jobId)!;
      const leads = this.getLeadsByJobId(jobId);

      return { job, leads };
    } catch (err) {
      const errorMsg = (err as Error).message || 'Internal discovery error';
      this.updateJobStatus(jobId, 'failed', 0, errorMsg, 0, 0, errorMsg);
      this.emitProgress({
        jobId,
        stage: 'failed',
        percent: 0,
        message: `Discovery failed: ${errorMsg}`,
        discoveredCount: 0,
        enrichedCount: 0,
      });
      throw err;
    }
  }

  public getJobById(jobId: string): DiscoveryJobRecord | null {
    const row = this.db
      .prepare('SELECT * FROM discovery_jobs WHERE id = ?')
      .get(jobId) as unknown as DiscoveryJobRecord | undefined;
    return row || null;
  }

  public getRecentJobs(limit = 10): DiscoveryJobRecord[] {
    return this.db
      .prepare('SELECT * FROM discovery_jobs ORDER BY created_at DESC LIMIT ?')
      .all(limit) as unknown as DiscoveryJobRecord[];
  }

  public getLeadsByJobId(
    jobId: string,
    filter?: { search?: string; status?: string; hasContact?: boolean }
  ): DiscoveredLeadRecord[] {
    let query = 'SELECT * FROM discovered_leads WHERE job_id = ?';
    const params: unknown[] = [jobId];

    if (filter?.search) {
      query += ' AND (company_name LIKE ? OR domain LIKE ? OR location LIKE ?)';
      const s = `%${filter.search}%`;
      params.push(s, s, s);
    }

    if (filter?.status) {
      query += ' AND extraction_status = ?';
      params.push(filter.status);
    }

    query += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(query).all(...params) as unknown as DiscoveredLeadRecord[];

    if (filter?.hasContact) {
      return rows.filter((r) => {
        const emails = r.emails ? (JSON.parse(r.emails) as DiscoveredContactEmail[]) : [];
        const phones = r.phones ? (JSON.parse(r.phones) as DiscoveredContactPhone[]) : [];
        return emails.length > 0 || phones.length > 0;
      });
    }

    return rows;
  }

  /**
   * Saves selected discovered leads into the permanent CRM database (companies, contacts, leads).
   */
  public async saveLeadsToCrm(
    jobId: string,
    leadIds: string[],
    userId = 'usr_admin_001'
  ): Promise<{ savedCount: number; errors: string[] }> {
    const leads = this.getLeadsByJobId(jobId).filter((l) => leadIds.includes(l.id));
    let savedCount = 0;
    const errors: string[] = [];

    const updateLeadSavedStmt = this.db.prepare(`
      UPDATE discovered_leads
      SET saved_to_crm = 1, saved_company_id = ?, saved_lead_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    for (const dLead of leads) {
      try {
        // 1. Create or retrieve company
        let companyId: string;
        try {
          const comp = this.companyService.create(
            {
              name: dLead.company_name,
              website: dLead.website,
              industry: dLead.category,
              location: dLead.location,
              employeeSize: '11-50',
              notes: `Automatically discovered via ${dLead.domain}. Address: ${dLead.address || 'Unavailable'}`,
            },
            userId
          );
          companyId = comp.id;
        } catch {
          // If already exists, retrieve existing company from database
          const existing = this.db
            .prepare(
              `SELECT id FROM companies WHERE (normalized_domain = ? AND normalized_domain != '') OR normalized_name = ? LIMIT 1`
            )
            .get(dLead.domain.toLowerCase(), dLead.company_name.toLowerCase().trim()) as { id: string } | undefined;

          if (existing) {
            companyId = existing.id;
          } else {
            const fallback = this.db
              .prepare(`SELECT id FROM companies WHERE name LIKE ? LIMIT 1`)
              .get(`%${dLead.company_name}%`) as { id: string } | undefined;
            if (fallback) {
              companyId = fallback.id;
            } else {
              throw new Error(`Unable to create or locate company record for ${dLead.company_name}`);
            }
          }
        }

        // 2. Parse emails and phones
        const emails: DiscoveredContactEmail[] = dLead.emails ? JSON.parse(dLead.emails) : [];
        const phones: DiscoveredContactPhone[] = dLead.phones ? JSON.parse(dLead.phones) : [];

        // 3. Create or reuse contact if an email or phone exists
        let contactId: string | undefined;
        if (emails.length > 0 || phones.length > 0) {
          const primaryEmail = emails[0]?.email;
          const primaryPhone = phones[0]?.phone;

          if (primaryEmail) {
            const existingContact = this.db
              .prepare(
                "SELECT id FROM contacts WHERE company_id = ? AND LOWER(email) = ? AND status != 'Archived' LIMIT 1"
              )
              .get(companyId, primaryEmail.toLowerCase().trim()) as { id: string } | undefined;
            if (existingContact) {
              contactId = existingContact.id;
            }
          }

          if (!contactId) {
            try {
              const contact = this.contactService.create({
                name: `${dLead.company_name} Inquiries`,
                companyId,
                title: emails[0]?.type === 'sales' ? 'Sales Inquiries' : 'General Contact',
                email: primaryEmail,
                phone: primaryPhone,
                notes: `Source URL: ${emails[0]?.sourceUrl || phones[0]?.sourceUrl || dLead.website}`,
                allowDuplicate: false,
              });
              contactId = contact.id;
            } catch {
              const fallbackContact = this.db
                .prepare("SELECT id FROM contacts WHERE company_id = ? AND status != 'Archived' LIMIT 1")
                .get(companyId) as { id: string } | undefined;
              if (fallbackContact) {
                contactId = fallbackContact.id;
              }
            }
          }
        }

        // 4. Create Lead in CRM pipeline
        const lead = this.leadService.create({
          title: `${dLead.company_name} — Discovered Opportunity`,
          companyId,
          contactId,
          product: 'Higher IQ',
          value: 15000,
          priority: emails.length > 0 ? 'High' : 'Medium',
          source: 'Automatic Lead Discovery',
          notes: `Extracted contacts: ${emails.map((e) => e.email).join(', ')}. Discovered in ${dLead.location}.`,
          assignedTo: userId,
          allowDuplicate: true,
        });

        // 5. Mark lead saved in discovered_leads
        updateLeadSavedStmt.run(companyId, lead.id, dLead.id);
        savedCount++;
      } catch (err) {
        errors.push(`Failed to save ${dLead.company_name}: ${(err as Error).message}`);
      }
    }

    return { savedCount, errors };
  }

  /**
   * Generates standard RFC 4180 CSV export of discovered leads.
   */
  public exportCsv(jobId: string): string {
    const leads = this.getLeadsByJobId(jobId);

    const escapeCsv = (str: string | null | undefined): string => {
      if (str === null || str === undefined) return '""';
      const cleaned = String(str).replace(/"/g, '""');
      return `"${cleaned}"`;
    };

    const headers = [
      'Company Name',
      'Category',
      'Location',
      'Official Website',
      'Domain',
      'Email Addresses',
      'Phone Numbers',
      'Physical Address',
      'Source URLs',
      'Extraction Status',
      'Saved To CRM',
      'Discovered Date',
    ];

    const rows: string[] = [headers.join(',')];

    for (const l of leads) {
      const emails: DiscoveredContactEmail[] = l.emails ? JSON.parse(l.emails) : [];
      const phones: DiscoveredContactPhone[] = l.phones ? JSON.parse(l.phones) : [];
      const sourceUrls: string[] = l.source_urls ? JSON.parse(l.source_urls) : [];

      const emailStr = emails.map((e) => `${e.email} (${e.status}, ${e.type})`).join('; ');
      const phoneStr = phones.map((p) => `${p.phone} (${p.status})`).join('; ');
      const sourceStr = sourceUrls.join('; ');

      rows.push(
        [
          escapeCsv(l.company_name),
          escapeCsv(l.category),
          escapeCsv(l.location),
          escapeCsv(l.website),
          escapeCsv(l.domain),
          escapeCsv(emailStr),
          escapeCsv(phoneStr),
          escapeCsv(l.address || 'Unavailable'),
          escapeCsv(sourceStr),
          escapeCsv(l.extraction_status),
          escapeCsv(l.saved_to_crm ? 'Yes' : 'No'),
          escapeCsv(l.created_at),
        ].join(',')
      );
    }

    return rows.join('\r\n');
  }

  private updateJobProgress(
    jobId: string,
    percent: number,
    message: string,
    discovered: number,
    enriched: number
  ): void {
    try {
      this.db
        .prepare(`
          UPDATE discovery_jobs
          SET progress_percent = ?, progress_message = ?, discovered_count = ?, enriched_count = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
        .run(percent, message, discovered, enriched, jobId);
    } catch {}
  }

  private updateJobStatus(
    jobId: string,
    status: string,
    percent: number,
    message: string,
    discovered: number,
    enriched: number,
    errorMessage?: string
  ): void {
    try {
      this.db
        .prepare(`
          UPDATE discovery_jobs
          SET status = ?, progress_percent = ?, progress_message = ?, discovered_count = ?, enriched_count = ?, error_message = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
        .run(status, percent, message, discovered, enriched, errorMessage || null, jobId);
    } catch {}
  }

  private emitProgress(event: DiscoveryProgressEvent): void {
    this.emit('progress', event);
    this.emit(`progress:${event.jobId}`, event);
  }
}

export const autoDiscoveryService = new AutoDiscoveryService();
