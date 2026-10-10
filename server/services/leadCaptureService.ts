import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import { LeadWithRelationsRecord } from '../db/types';

export interface AtsScoreLeadCaptureInput {
  fullName: string;
  email: string;
  phone?: string | null;
  companyName: string;
  jobTitle?: string | null;
  atsScore?: number | null;
  resumeName?: string | null;
  notes?: string | null;
  campaignId?: string | null;
}

export interface AtsScoreLeadCaptureResult {
  lead: LeadWithRelationsRecord;
  isExistingContact: boolean;
  contactId: string;
  companyId: string;
}

export class LeadCaptureService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  captureAtsScoreLead(input: AtsScoreLeadCaptureInput, capturedBy?: string): AtsScoreLeadCaptureResult {
    if (!input.fullName || input.fullName.trim().length === 0) {
      throw new Error('Full name is required');
    }
    if (!input.email || !input.email.includes('@')) {
      throw new Error('Valid email address is required');
    }
    if (!input.companyName || input.companyName.trim().length === 0) {
      throw new Error('Company name is required');
    }

    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.fullName.trim();
    const cleanCompany = input.companyName.trim();
    const cleanJobTitle = input.jobTitle?.trim() || 'Hiring Lead';
    const atsScore = input.atsScore !== undefined && input.atsScore !== null ? Number(input.atsScore) : 75;

    // 1. Prevent duplicate contacts: Check if contact with email already exists
    const existingContact = this.db.prepare(`
      SELECT * FROM contacts WHERE LOWER(email) = LOWER(?) LIMIT 1
    `).get(cleanEmail) as unknown as { id: string; company_id: string; name: string } | undefined;

    let contactId: string;
    let companyId: string;
    let isExistingContact = false;

    if (existingContact) {
      isExistingContact = true;
      contactId = existingContact.id;
      companyId = existingContact.company_id;

      // Update phone or title if provided and currently empty
      if (input.phone) {
        this.db.prepare('UPDATE contacts SET phone = COALESCE(phone, ?) WHERE id = ?').run(input.phone.trim(), contactId);
      }
    } else {
      // 2. Check if company already exists
      const normalizedCompany = cleanCompany.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingCompany = this.db.prepare(`
        SELECT id FROM companies WHERE normalized_name = ? LIMIT 1
      `).get(normalizedCompany) as unknown as { id: string } | undefined;

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Create new company
        companyId = `comp-${crypto.randomUUID()}`;
        const domain = `${normalizedCompany || 'company'}.com`;
        this.db.prepare(`
          INSERT INTO companies (
            id, name, normalized_name, website, normalized_domain, industry, location,
            employee_size, product_fit, lead_relevance_score, status, notes, created_by,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'IT & Technology', 'India', '50-200', 'High', 85, 'Prospect', ?, ?, datetime('now'), datetime('now'))
        `).run(
          companyId,
          cleanCompany,
          normalizedCompany,
          `https://${domain}`,
          domain,
          `Inbound lead captured via Free ATS Score Check (${atsScore}% score)`,
          capturedBy || null
        );
      }

      // Create new contact
      contactId = `cont-${crypto.randomUUID()}`;
      const isDecisionMaker = /recruiter|talent|hr|head|founder|ceo|director|manager/i.test(cleanJobTitle) ? 1 : 0;
      this.db.prepare(`
        INSERT INTO contacts (
          id, company_id, name, email, phone, title, department, decision_maker,
          notes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'Human Resources', ?, ?, 'Active', datetime('now'), datetime('now'))
      `).run(
        contactId,
        companyId,
        cleanName,
        cleanEmail,
        input.phone?.trim() || null,
        cleanJobTitle,
        isDecisionMaker,
        `Captured from Free ATS Score Check. Resume: ${input.resumeName || 'Applicant.pdf'}`
      );
    }

    // 3. Connect to existing campaign if provided or default
    let campaignId = input.campaignId || null;
    if (campaignId) {
      const exists = this.db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId);
      if (!exists) campaignId = null;
    } else {
      const defaultCmp = this.db.prepare("SELECT id FROM campaigns WHERE lead_source = 'Free ATS Score Check' LIMIT 1").get() as { id: string } | undefined;
      campaignId = defaultCmp?.id || null;
    }

    // 4. Calculate qualification score and priority based on ATS score & decision maker
    const qualificationScore = Math.min(100, Math.max(50, Math.round(atsScore)));
    const priority = qualificationScore >= 80 ? 'High' : (qualificationScore >= 60 ? 'Medium' : 'Low');

    // 5. Create new Lead
    const leadId = `lead-${crypto.randomUUID()}`;
    const leadTitle = `ATS Resume Score (${atsScore}%) — ${cleanCompany}`;
    const notes = [
      `Inbound Free ATS Score Check Lead`,
      `Score: ${atsScore}/100`,
      input.resumeName ? `Resume: ${input.resumeName}` : null,
      input.notes ? `Candidate Note: ${input.notes}` : null,
      isExistingContact ? `(Contact was already in database; existing profile re-engaged)` : null,
    ].filter(Boolean).join('\n');

    this.db.prepare(`
      INSERT INTO leads (
        id, company_id, contact_id, campaign_id, product, title, value, status, priority,
        source, ats_score, qualification_score, qualification_notes, notes,
        hiring_volume, hiring_multiple_roles, manual_hr_processes, decision_maker_identified,
        created_at, updated_at, stage_changed_at
      ) VALUES (
        ?, ?, ?, ?, 'Higher IQ', ?, 12000, 'New', ?,
        'Free ATS Score Check', ?, ?, 'High inbound recruitment engagement from ATS verification tool.', ?,
        'High', 1, 1, 1,
        datetime('now'), datetime('now'), datetime('now')
      )
    `).run(
      leadId,
      companyId,
      contactId,
      campaignId,
      leadTitle,
      priority,
      atsScore,
      qualificationScore,
      notes
    );

    // Record stage history
    this.db.prepare(`
      INSERT INTO lead_stage_history (
        id, lead_id, from_stage, to_stage, changed_by, notes, created_at
      ) VALUES (?, ?, NULL, 'New', ?, 'Lead created via Free ATS Score Check inbound funnel', datetime('now'))
    `).run(`lsh-${crypto.randomUUID()}`, leadId, capturedBy || null);

    // Retrieve created lead with full relations
    const leadWithRelations = this.db.prepare(`
      SELECT 
        l.*,
        c.name AS company_name,
        c.website AS company_website,
        c.normalized_domain AS company_domain,
        c.industry AS company_industry,
        c.location AS company_location,
        c.employee_size AS company_employee_size,
        c.product_fit AS company_product_fit,
        ct.name AS contact_name,
        ct.title AS contact_title,
        ct.email AS contact_email,
        ct.phone AS contact_phone,
        ct.decision_maker AS contact_decision_maker,
        cmp.name AS campaign_name
      FROM leads l
      JOIN companies c ON l.company_id = c.id
      LEFT JOIN contacts ct ON l.contact_id = ct.id
      LEFT JOIN campaigns cmp ON l.campaign_id = cmp.id
      WHERE l.id = ?
    `).get(leadId) as unknown as LeadWithRelationsRecord;

    return {
      lead: leadWithRelations,
      isExistingContact,
      contactId,
      companyId,
    };
  }
}

export const leadCaptureService = new LeadCaptureService();
