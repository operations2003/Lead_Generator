import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import {
  LeadWithRelationsRecord,
  CompanyRecord,
  ContactRecord,
  ProductType,
  LeadPriorityType,
  LeadStageType,
} from '../db/types';
import {
  evaluateLeadQualification,
  validateAndReconcilePriority,
  QualificationResult,
  QualificationSignalsInput,
} from './qualificationEngine';
import {
  validateStageTransition,
  PIPELINE_STAGES,
} from './leadPipelineEngine';

export interface StageChangeInput {
  stage: LeadStageType;
  notes?: string | null;
  lostReason?: string | null;
  changedBy?: string | null;
}

export interface LeadStageHistoryItem {
  id: string;
  leadId: string;
  fromStage: LeadStageType | null;
  toStage: LeadStageType;
  changedBy: string | null;
  notes: string | null;
  lostReason: string | null;
  createdAt: string;
}

export interface CreateLeadInput {
  companyId: string;
  contactId?: string | null;
  campaignId?: string | null;
  product: ProductType;
  title: string;
  value?: number;
  status?: LeadStageType;
  priority?: LeadPriorityType;
  hiringVolume?: 'High' | 'Medium' | 'Low' | 'None';
  hiringMultipleRoles?: boolean;
  manualHrProcesses?: boolean;
  existingTools?: string | null;
  companySize?: string | null;
  decisionMakerIdentified?: boolean;
  qualificationNotes?: string | null;
  notes?: string | null;
  source?: string | null;
  referrerName?: string | null;
  referrerContact?: string | null;
  partnerName?: string | null;
  referralNotes?: string | null;
  atsScore?: number | null;
  assignedTo?: string | null;
  allowDuplicate?: boolean;
  lostReason?: string | null;
}

export interface UpdateLeadInput {
  companyId?: string;
  contactId?: string | null;
  campaignId?: string | null;
  product?: ProductType;
  title?: string;
  value?: number;
  status?: LeadStageType;
  priority?: LeadPriorityType;
  hiringVolume?: 'High' | 'Medium' | 'Low' | 'None';
  hiringMultipleRoles?: boolean;
  manualHrProcesses?: boolean;
  existingTools?: string | null;
  companySize?: string | null;
  decisionMakerIdentified?: boolean;
  qualificationNotes?: string | null;
  notes?: string | null;
  source?: string | null;
  referrerName?: string | null;
  referrerContact?: string | null;
  partnerName?: string | null;
  referralNotes?: string | null;
  atsScore?: number | null;
  assignedTo?: string | null;
  allowDuplicate?: boolean;
  lostReason?: string | null;
}

export interface LeadFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  product?: string;
  priority?: string;
  status?: string;
  campaignId?: string;
  source?: string;
  companyId?: string;
  contactId?: string;
  minScore?: number;
  includeArchived?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Phase 9 Advanced Lead Discovery Filters
  existingTools?: string;
  existingTool?: string;
  signals?: string;
  hiringSignals?: string;
  leadSignals?: string;
  hiringVolume?: string;
  followUpStatus?: string;
  industry?: string;
  location?: string;
  employeeSize?: string;
  productFit?: string;
  jobTitle?: string;
  decisionMaker?: boolean | string;
  company?: string;
  productRelevance?: string;
}

export interface LeadPipelineStageGroup {
  stage: LeadStageType;
  count: number;
  totalValue: number;
  leads: LeadDetailResponse[];
}

export interface LeadDetailResponse {
  id: string;
  companyId: string;
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  companyIndustry?: string;
  companyLocation?: string;
  companyProductFit?: string;
  companyCurrentTools?: string | null;
  companyHiringSignals?: string | null;
  contactId: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactDecisionMaker: boolean;
  campaignId?: string | null;
  campaignName?: string | null;
  product: ProductType;
  title: string;
  value: number;
  status: LeadStageType;
  priority: LeadPriorityType;
  hiringVolume: 'High' | 'Medium' | 'Low' | 'None';
  hiringMultipleRoles: boolean;
  manualHrProcesses: boolean;
  existingTools: string | null;
  companySize: string | null;
  decisionMakerIdentified: boolean;
  qualificationScore: number;
  qualificationNotes: string | null;
  notes: string | null;
  source: string | null;
  referrerName?: string | null;
  referrerContact?: string | null;
  partnerName?: string | null;
  referralNotes?: string | null;
  atsScore?: number | null;
  assignedTo: string | null;
  lostReason: string | null;
  wonAt: string | null;
  lostAt: string | null;
  stageChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  qualificationBreakdown?: QualificationResult;
  stageHistory?: LeadStageHistoryItem[];
  followUpStatus?: string;
  followUpDueDate?: string | null;
  detectedSignals?: string[];
}

export interface PaginatedLeadsResult {
  items: LeadDetailResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class LeadService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  private extractLeadSignals(row: LeadWithRelationsRecord): string[] {
    const signals = new Set<string>();
    const text = `${row.title || ''} ${row.notes || ''} ${row.qualification_notes || ''} ${row.company_hiring_signals || ''} ${row.company_current_tools || ''}`.toLowerCase();
    const industry = (row.company_industry || '').toLowerCase();
    const tools = `${row.existing_tools || ''} ${row.company_current_tools || ''}`.toLowerCase();

    // HireIQ signals
    if (row.hiring_volume === 'High' || text.includes('bulk') || text.includes('mass hire') || text.includes('high-volume') || text.includes('high volume')) {
      signals.add('Bulk hiring');
      signals.add('High-volume hiring');
    }
    if (row.hiring_multiple_roles || text.includes('multiple roles') || text.includes('open roles')) {
      signals.add('Multiple open roles');
    }
    if (text.includes('screen') || text.includes('resume') || row.ats_score != null) {
      signals.add('Resume screening');
    }
    if (text.includes('shortlist') || row.ats_score != null) {
      signals.add('Shortlisting');
    }
    if (tools.includes('ats') || tools.includes('greenhouse') || tools.includes('workable') || tools.includes('lever') || tools.includes('naukri') || tools.includes('recruit') || text.includes('ats') || row.source === 'Free ATS Score Check') {
      signals.add('ATS');
    }
    if (industry.includes('staffing') || industry.includes('recruit') || text.includes('agency') || text.includes('recruitment agency')) {
      signals.add('Recruitment agency');
      signals.add('Staffing');
    }
    if (industry.includes('staffing') || text.includes('staffing')) {
      signals.add('Staffing');
    }
    if (text.includes('rpo')) {
      signals.add('RPO');
    }

    // HRMS signals
    if (row.manual_hr_processes || text.includes('manual attendance') || text.includes('attendance') || text.includes('biometric')) {
      signals.add('Manual attendance');
    }
    if (row.manual_hr_processes || tools.includes('excel') || text.includes('excel') || text.includes('spreadsheet')) {
      signals.add('Excel HR processes');
    }
    if (row.manual_hr_processes || text.includes('payroll') || tools.includes('greythr') || tools.includes('keka') || tools.includes('darwinbox')) {
      signals.add('Payroll');
    }
    if (text.includes('leave') || text.includes('time off') || text.includes('vacation')) {
      signals.add('Leave management');
    }
    if (text.includes('employee record') || text.includes('personnel') || text.includes('records')) {
      signals.add('Employee records');
    }
    if (row.product === 'HRMS Portal' || row.product === 'Both' || tools.includes('hrms') || tools.includes('zoho people') || tools.includes('darwinbox') || text.includes('hrms')) {
      signals.add('HRMS');
      signals.add('HR software');
    }

    return Array.from(signals);
  }

  private mapRecordToLead(
    row: LeadWithRelationsRecord,
    breakdown?: QualificationResult,
    stageHistory?: LeadStageHistoryItem[]
  ): LeadDetailResponse {
    const detectedSignals = this.extractLeadSignals(row);

    return {
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      companyWebsite: row.company_website,
      companyDomain: row.company_domain,
      companyIndustry: row.company_industry,
      companyLocation: row.company_location,
      companyProductFit: row.company_product_fit,
      companyCurrentTools: row.company_current_tools || null,
      companyHiringSignals: row.company_hiring_signals || null,
      contactId: row.contact_id,
      contactName: row.contact_name,
      contactTitle: row.contact_title,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      contactDecisionMaker: Boolean(row.contact_decision_maker),
      campaignId: row.campaign_id || null,
      campaignName: row.campaign_name || null,
      product: row.product,
      title: row.title,
      value: row.value,
      status: row.status,
      priority: row.priority,
      hiringVolume: row.hiring_volume,
      hiringMultipleRoles: Boolean(row.hiring_multiple_roles),
      manualHrProcesses: Boolean(row.manual_hr_processes),
      existingTools: row.existing_tools,
      companySize: row.company_size,
      decisionMakerIdentified: Boolean(row.decision_maker_identified),
      qualificationScore: row.qualification_score,
      qualificationNotes: row.qualification_notes,
      notes: row.notes,
      source: row.source,
      referrerName: row.referrer_name || null,
      referrerContact: row.referrer_contact || null,
      partnerName: row.partner_name || null,
      referralNotes: row.referral_notes || null,
      atsScore: row.ats_score !== undefined && row.ats_score !== null ? Number(row.ats_score) : null,
      assignedTo: row.assigned_to,
      lostReason: row.lost_reason || null,
      wonAt: row.won_at || null,
      lostAt: row.lost_at || null,
      stageChangedAt: row.stage_changed_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      qualificationBreakdown: breakdown,
      stageHistory,
      followUpStatus: row.computed_follow_up_status || undefined,
      followUpDueDate: row.next_follow_up_due_date || null,
      detectedSignals,
    };
  }

  /**
   * Check for existing active lead for same company and product.
   */
  public checkDuplicate(
    companyId: string,
    product: ProductType,
    excludeLeadId?: string
  ): { isDuplicate: boolean; existingLead?: { id: string; title: string; companyName: string; product: string; status: string } } {
    if (!companyId || !product) {
      return { isDuplicate: false };
    }

    let query = `
      SELECT l.id, l.title, l.product, l.status, c.name AS company_name
      FROM leads l
      JOIN companies c ON l.company_id = c.id
      WHERE l.company_id = ? AND l.product = ? AND l.status NOT IN ('Archived', 'Lost')
    `;
    const params: string[] = [companyId, product];

    if (excludeLeadId) {
      query += ' AND l.id != ?';
      params.push(excludeLeadId);
    }

    const row = this.db.prepare(query).get(...params) as unknown as
      | { id: string; title: string; product: string; status: string; company_name: string }
      | undefined;

    if (row) {
      return {
        isDuplicate: true,
        existingLead: {
          id: row.id,
          title: row.title,
          product: row.product,
          status: row.status,
          companyName: row.company_name,
        },
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Compute qualification and priority preview without saving.
   * Keeps backend as the single source of truth for qualification math.
   */
  public previewQualification(
    signals: QualificationSignalsInput,
    companyId: string,
    contactId?: string | null
  ): QualificationResult {
    let company: CompanyRecord | undefined;
    if (companyId) {
      company = this.db
        .prepare('SELECT id, name, product_fit, employee_count, industry FROM companies WHERE id = ?')
        .get(companyId) as unknown as CompanyRecord | undefined;
    }

    let contact: ContactRecord | undefined;
    if (contactId) {
      contact = this.db
        .prepare('SELECT id, name, title, department, decision_maker FROM contacts WHERE id = ?')
        .get(contactId) as unknown as ContactRecord | undefined;
    }

    return evaluateLeadQualification(
      signals,
      contact
        ? {
            id: contact.id,
            name: contact.name,
            title: contact.title,
            department: contact.department,
            decisionMaker: Boolean(contact.decision_maker),
          }
        : null,
      company
        ? {
            id: company.id,
            name: company.name,
            productFit: company.product_fit,
            employeeCount: company.employee_count,
            industry: company.industry,
          }
        : null
    );
  }

  /**
   * Check for duplicate active leads by company, product, and optional contact.
   */
  public checkDuplicate(
    companyId: string,
    product: string,
    contactId?: string
  ): { isDuplicate: boolean; existingLead?: LeadRecord } {
    let query = `
      SELECT * FROM leads
      WHERE company_id = ? AND product = ? AND status NOT IN ('Won', 'Lost', 'Archived')
    `;
    const params: (string | null)[] = [companyId, product];
    if (contactId) {
      query += ' AND contact_id = ?';
      params.push(contactId);
    }
    query += ' LIMIT 1';
    const existing = this.db.prepare(query).get(...params) as unknown as LeadRecord | undefined;
    return {
      isDuplicate: Boolean(existing),
      existingLead: existing,
    };
  }

  /**
   * Create a new lead with qualification evaluation and priority validation.
   */
  public create(input: CreateLeadInput): LeadDetailResponse {
    const title = input.title?.trim();
    if (!title) {
      throw { status: 400, message: 'Lead title is required', code: 'MISSING_TITLE' };
    }

    const companyId = input.companyId?.trim();
    if (!companyId) {
      throw { status: 400, message: 'Company association is required', code: 'MISSING_COMPANY_ID' };
    }

    const product = input.product;
    if (!product || !['Higher IQ', 'HRMS Portal', 'Both'].includes(product)) {
      throw { status: 400, message: 'Valid product selection is required (Higher IQ, HRMS Portal, Both)', code: 'INVALID_PRODUCT' };
    }

    // Verify company existence
    const company = this.db
      .prepare('SELECT id, name, product_fit, employee_count, industry, employee_size FROM companies WHERE id = ?')
      .get(companyId) as unknown as CompanyRecord | undefined;

    if (!company) {
      throw { status: 404, message: `Company with ID "${companyId}" does not exist`, code: 'COMPANY_NOT_FOUND' };
    }

    // Verify contact relationship if provided
    let contact: ContactRecord | undefined;
    const contactId = input.contactId?.trim() || null;
    if (contactId) {
      contact = this.db
        .prepare('SELECT id, company_id, name, title, department, decision_maker FROM contacts WHERE id = ?')
        .get(contactId) as unknown as ContactRecord | undefined;

      if (!contact) {
        throw { status: 404, message: `Contact with ID "${contactId}" not found`, code: 'CONTACT_NOT_FOUND' };
      }
      if (contact.company_id !== companyId) {
        throw {
          status: 400,
          message: `Contact "${contact.name}" belongs to another company, not "${company.name}"`,
          code: 'CONTACT_COMPANY_MISMATCH',
        };
      }
    }

    // Duplicate check
    if (!input.allowDuplicate) {
      const dup = this.checkDuplicate(companyId, product);
      if (dup.isDuplicate && dup.existingLead) {
        throw {
          status: 409,
          message: `An active lead already exists for "${company.name}" and product "${product}" (${dup.existingLead.title} - ${dup.existingLead.status})`,
          code: 'DUPLICATE_LEAD_EXISTS',
          duplicateLead: dup.existingLead,
        };
      }
    }

    // Evaluate qualification signals using the backend business engine
    const signals: QualificationSignalsInput = {
      product,
      hiringVolume: input.hiringVolume || 'Medium',
      hiringMultipleRoles: Boolean(input.hiringMultipleRoles),
      manualHrProcesses: Boolean(input.manualHrProcesses),
      existingTools: input.existingTools || null,
      companySize: input.companySize || company.employee_size || null,
      decisionMakerIdentified: Boolean(
        input.decisionMakerIdentified || (contact && contact.decision_maker === 1)
      ),
    };

    const qualResult = evaluateLeadQualification(
      signals,
      contact
        ? {
            id: contact.id,
            name: contact.name,
            title: contact.title,
            department: contact.department,
            decisionMaker: Boolean(contact.decision_maker),
          }
        : null,
      {
        id: company.id,
        name: company.name,
        productFit: company.product_fit,
        employeeCount: company.employee_count,
        industry: company.industry,
      }
    );

    // Validate and enforce priority business rules
    const { priority } = validateAndReconcilePriority(input.priority, qualResult);

    const id = `ld_${crypto.randomBytes(6).toString('hex')}`;
    const value = typeof input.value === 'number' ? input.value : 0;
    const status = input.status || 'New';
    const notes = input.notes?.trim() || null;
    const qualificationNotes = input.qualificationNotes?.trim() || qualResult.qualificationNotes;
    const source = input.source?.trim() || 'IT Mapping Sourced';
    const assignedTo = input.assignedTo?.trim() || null;

    const insertStmt = this.db.prepare(`
      INSERT INTO leads (
        id, company_id, contact_id, campaign_id, product, title, value, status, priority,
        hiring_volume, hiring_multiple_roles, manual_hr_processes, existing_tools,
        company_size, decision_maker_identified, qualification_score, qualification_notes, notes,
        source, referrer_name, referrer_contact, partner_name, referral_notes, ats_score, assigned_to, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    insertStmt.run(
      id,
      companyId,
      contactId,
      input.campaignId || null,
      product,
      title,
      value,
      status,
      priority,
      signals.hiringVolume,
      signals.hiringMultipleRoles ? 1 : 0,
      signals.manualHrProcesses ? 1 : 0,
      signals.existingTools,
      signals.companySize,
      signals.decisionMakerIdentified ? 1 : 0,
      qualResult.score,
      qualificationNotes,
      notes,
      source,
      input.referrerName?.trim() || null,
      input.referrerContact?.trim() || null,
      input.partnerName?.trim() || null,
      input.referralNotes?.trim() || null,
      input.atsScore !== undefined && input.atsScore !== null ? Number(input.atsScore) : null,
      assignedTo
    );

    // Record initial stage in history
    this.recordStageHistory(id, null, status, assignedTo, 'Lead created in pipeline.', input.lostReason);

    return this.getById(id)!;
  }

  /**
   * Get lead by ID with complete Company and Contact relationships and Stage History.
   */
  public getById(id: string): LeadDetailResponse | null {
    const row = this.db
      .prepare(`
        SELECT 
          l.id, l.company_id, l.contact_id, l.campaign_id, l.product, l.title, l.value, l.status, l.priority,
          l.hiring_volume, l.hiring_multiple_roles, l.manual_hr_processes, l.existing_tools,
          l.company_size, l.decision_maker_identified, l.qualification_score, l.qualification_notes,
          l.notes, l.source, l.referrer_name, l.referrer_contact, l.partner_name, l.referral_notes, l.ats_score,
          l.assigned_to, l.lost_reason, l.won_at, l.lost_at, l.stage_changed_at,
          l.created_at, l.updated_at,
          co.name AS company_name, co.website AS company_website, co.normalized_domain AS company_domain,
          co.industry AS company_industry, co.location AS company_location, co.employee_size AS company_employee_size,
          co.product_fit AS company_product_fit,
          cnt.name AS contact_name, cnt.title AS contact_title, cnt.email AS contact_email,
          cnt.phone AS contact_phone, cnt.decision_maker AS contact_decision_maker,
          cmp.name AS campaign_name
        FROM leads l
        JOIN companies co ON l.company_id = co.id
        LEFT JOIN contacts cnt ON l.contact_id = cnt.id
        LEFT JOIN campaigns cmp ON l.campaign_id = cmp.id
        WHERE l.id = ?
      `)
      .get(id) as unknown as LeadWithRelationsRecord | undefined;

    if (!row) {
      return null;
    }

    // Retrieve stage history records
    const historyRows = this.db
      .prepare(`
        SELECT id, lead_id, from_stage, to_stage, changed_by, notes, lost_reason, created_at
        FROM lead_stage_history
        WHERE lead_id = ?
        ORDER BY created_at DESC, rowid DESC
      `)
      .all(id) as unknown as Array<{
        id: string;
        lead_id: string;
        from_stage: LeadStageType | null;
        to_stage: LeadStageType;
        changed_by: string | null;
        notes: string | null;
        lost_reason: string | null;
        created_at: string;
      }>;

    const stageHistory: LeadStageHistoryItem[] = historyRows.map((h) => ({
      id: h.id,
      leadId: h.lead_id,
      fromStage: h.from_stage,
      toStage: h.to_stage,
      changedBy: h.changed_by,
      notes: h.notes,
      lostReason: h.lost_reason,
      createdAt: h.created_at,
    }));

    // Compute live breakdown for rich UI presentation
    const breakdown = evaluateLeadQualification(
      {
        product: row.product,
        hiringVolume: row.hiring_volume,
        hiringMultipleRoles: Boolean(row.hiring_multiple_roles),
        manualHrProcesses: Boolean(row.manual_hr_processes),
        existingTools: row.existing_tools,
        companySize: row.company_size,
        decisionMakerIdentified: Boolean(row.decision_maker_identified),
      },
      row.contact_id
        ? {
            id: row.contact_id,
            name: row.contact_name,
            title: row.contact_title,
            decisionMaker: Boolean(row.contact_decision_maker),
          }
        : null,
      {
        productFit: row.company_product_fit as 'High' | 'Medium' | 'Low',
      }
    );

    return this.mapRecordToLead(row, breakdown, stageHistory);
  }

  /**
   * List / filter / search / paginate leads with Phase 9 Advanced Lead Discovery.
   */
  public list(options: LeadFilterOptions = {}): PaginatedLeadsResult {
    const page = Math.max(1, typeof options.page === 'number' && !isNaN(options.page) ? options.page : 1);
    const limit = Math.min(100, Math.max(1, typeof options.limit === 'number' && !isNaN(options.limit) ? options.limit : 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Filter by archive status
    if (!options.includeArchived) {
      if (options.status) {
        conditions.push('l.status = ?');
        params.push(options.status);
      } else {
        conditions.push("l.status != 'Archived'");
      }
    } else if (options.status) {
      conditions.push('l.status = ?');
      params.push(options.status);
    }

    if (options.product) {
      conditions.push('l.product = ?');
      params.push(options.product);
    }

    if (options.priority) {
      conditions.push('l.priority = ?');
      params.push(options.priority);
    }

    if (options.companyId) {
      conditions.push('l.company_id = ?');
      params.push(options.companyId);
    }

    if (options.contactId) {
      conditions.push('l.contact_id = ?');
      params.push(options.contactId);
    }

    if (options.campaignId) {
      conditions.push('l.campaign_id = ?');
      params.push(options.campaignId);
    }

    if (options.source) {
      conditions.push('l.source = ?');
      params.push(options.source);
    }

    if (typeof options.minScore === 'number' && !isNaN(options.minScore)) {
      conditions.push('l.qualification_score >= ?');
      params.push(options.minScore);
    }

    // Company filters on Lead
    if (options.industry) {
      conditions.push('(co.industry = ? OR LOWER(co.industry) LIKE ?)');
      params.push(options.industry, `%${options.industry.toLowerCase()}%`);
    }

    if (options.location) {
      conditions.push('LOWER(co.location) LIKE ?');
      params.push(`%${options.location.toLowerCase()}%`);
    }

    if (options.employeeSize) {
      conditions.push('(co.employee_size = ? OR l.company_size = ?)');
      params.push(options.employeeSize, options.employeeSize);
    }

    if (options.hiringVolume) {
      conditions.push('l.hiring_volume = ?');
      params.push(options.hiringVolume);
    }

    if (options.productFit) {
      conditions.push('co.product_fit = ?');
      params.push(options.productFit);
    }

    // Contact filters on Lead
    if (options.jobTitle) {
      conditions.push('LOWER(cnt.title) LIKE ?');
      params.push(`%${options.jobTitle.toLowerCase()}%`);
    }

    if (options.decisionMaker !== undefined) {
      const isDm = options.decisionMaker === true || options.decisionMaker === 'true' || options.decisionMaker === '1' || options.decisionMaker === 1;
      conditions.push('cnt.decision_maker = ?');
      params.push(isDm ? 1 : 0);
    }

    if (options.company) {
      conditions.push('(LOWER(co.name) LIKE ? OR co.id = ?)');
      params.push(`%${options.company.toLowerCase()}%`, options.company);
    }

    if (options.productRelevance) {
      conditions.push('(co.product_fit = ? OR l.product = ?)');
      params.push(options.productRelevance, options.productRelevance);
    }

    // Existing tool filters (supports comma-separated tools and 'No known tool')
    const toolFilter = options.existingTools || options.existingTool;
    if (toolFilter && toolFilter.trim()) {
      const tools = toolFilter.split(',').map((t) => t.trim()).filter(Boolean);
      if (tools.length > 0) {
        const toolClauses: string[] = [];
        for (const t of tools) {
          if (t.toLowerCase() === 'no known tool' || t.toLowerCase() === 'none') {
            toolClauses.push(`
              ((l.existing_tools IS NULL OR TRIM(l.existing_tools) = '' OR LOWER(l.existing_tools) LIKE '%none%' OR LOWER(l.existing_tools) LIKE '%no known%')
              AND (co.current_tools IS NULL OR TRIM(co.current_tools) = '' OR LOWER(co.current_tools) LIKE '%none%' OR LOWER(co.current_tools) LIKE '%no known%'))
            `);
          } else {
            toolClauses.push('(LOWER(l.existing_tools) LIKE ? OR LOWER(co.current_tools) LIKE ?)');
            const term = `%${t.toLowerCase()}%`;
            params.push(term, term);
          }
        }
        if (toolClauses.length > 0) {
          conditions.push(`(${toolClauses.join(' OR ')})`);
        }
      }
    }

    // Lead signals filters (HireIQ & HRMS signals, comma-separated)
    const signalFilter = options.leadSignals || options.hiringSignals || options.signals;
    if (signalFilter && signalFilter.trim()) {
      const sigs = signalFilter.split(',').map((s) => s.trim()).filter(Boolean);
      if (sigs.length > 0) {
        const sigClauses: string[] = [];
        for (const s of sigs) {
          const lower = s.toLowerCase();
          if (lower === 'bulk hiring') {
            sigClauses.push(`(l.hiring_volume = 'High' OR l.hiring_multiple_roles = 1 OR LOWER(co.hiring_signals) LIKE '%bulk%' OR LOWER(co.hiring_signals) LIKE '%high%volume%' OR LOWER(l.notes) LIKE '%bulk%' OR LOWER(l.qualification_notes) LIKE '%bulk%')`);
          } else if (lower === 'high-volume hiring' || lower === 'high volume hiring') {
            sigClauses.push(`(l.hiring_volume = 'High' OR LOWER(co.hiring_signals) LIKE '%high%volume%' OR LOWER(co.hiring_signals) LIKE '%volume%' OR LOWER(l.notes) LIKE '%high-volume%')`);
          } else if (lower === 'multiple open roles' || lower === 'multiple roles') {
            sigClauses.push(`(l.hiring_multiple_roles = 1 OR LOWER(co.hiring_signals) LIKE '%multiple%roles%' OR LOWER(co.hiring_signals) LIKE '%open roles%' OR LOWER(l.notes) LIKE '%multiple%roles%')`);
          } else if (lower === 'resume screening' || lower === 'screening') {
            sigClauses.push(`(LOWER(l.qualification_notes) LIKE '%screen%' OR LOWER(l.notes) LIKE '%screen%' OR LOWER(co.hiring_signals) LIKE '%screen%' OR l.ats_score IS NOT NULL)`);
          } else if (lower === 'shortlisting' || lower === 'shortlist') {
            sigClauses.push(`(LOWER(l.qualification_notes) LIKE '%shortlist%' OR LOWER(l.notes) LIKE '%shortlist%' OR LOWER(co.hiring_signals) LIKE '%shortlist%')`);
          } else if (lower === 'ats') {
            sigClauses.push(`(LOWER(l.existing_tools) LIKE '%ats%' OR LOWER(co.current_tools) LIKE '%ats%' OR l.source = 'Free ATS Score Check' OR LOWER(l.title) LIKE '%ats%' OR LOWER(co.current_tools) LIKE '%greenhouse%' OR LOWER(co.current_tools) LIKE '%workable%' OR LOWER(co.current_tools) LIKE '%lever%' OR LOWER(co.current_tools) LIKE '%naukri%')`);
          } else if (lower === 'recruitment agency') {
            sigClauses.push(`(LOWER(co.industry) LIKE '%staffing%' OR LOWER(co.industry) LIKE '%recruit%' OR LOWER(co.name) LIKE '%agency%' OR LOWER(l.notes) LIKE '%agency%')`);
          } else if (lower === 'staffing') {
            sigClauses.push(`(LOWER(co.industry) LIKE '%staffing%' OR LOWER(co.name) LIKE '%staffing%' OR LOWER(l.notes) LIKE '%staffing%')`);
          } else if (lower === 'rpo') {
            sigClauses.push(`(LOWER(co.hiring_signals) LIKE '%rpo%' OR LOWER(l.notes) LIKE '%rpo%' OR LOWER(co.notes) LIKE '%rpo%')`);
          } else if (lower === 'manual attendance') {
            sigClauses.push(`(l.manual_hr_processes = 1 OR LOWER(l.notes) LIKE '%manual attendance%' OR LOWER(l.notes) LIKE '%attendance%')`);
          } else if (lower === 'excel hr processes' || lower === 'excel hr') {
            sigClauses.push(`(l.manual_hr_processes = 1 OR LOWER(l.existing_tools) LIKE '%excel%' OR LOWER(co.current_tools) LIKE '%excel%' OR LOWER(l.notes) LIKE '%excel%')`);
          } else if (lower === 'payroll') {
            sigClauses.push(`(LOWER(l.title) LIKE '%payroll%' OR LOWER(l.notes) LIKE '%payroll%' OR LOWER(l.qualification_notes) LIKE '%payroll%' OR LOWER(co.notes) LIKE '%payroll%' OR LOWER(co.current_tools) LIKE '%greythr%' OR LOWER(co.current_tools) LIKE '%keka%' OR LOWER(co.current_tools) LIKE '%darwinbox%')`);
          } else if (lower === 'leave management' || lower === 'leave') {
            sigClauses.push(`(l.manual_hr_processes = 1 OR LOWER(l.notes) LIKE '%leave%' OR LOWER(co.notes) LIKE '%leave%')`);
          } else if (lower === 'employee records' || lower === 'records') {
            sigClauses.push(`(l.manual_hr_processes = 1 OR LOWER(l.notes) LIKE '%employee record%' OR LOWER(l.notes) LIKE '%records%')`);
          } else if (lower === 'hrms') {
            sigClauses.push(`(l.product IN ('HRMS Portal', 'Both') OR LOWER(co.current_tools) LIKE '%hrms%' OR LOWER(l.notes) LIKE '%hrms%' OR LOWER(co.current_tools) LIKE '%darwinbox%' OR LOWER(co.current_tools) LIKE '%zoho people%' OR LOWER(co.current_tools) LIKE '%keka%')`);
          } else if (lower === 'hr software') {
            sigClauses.push(`(l.product IN ('HRMS Portal', 'Both') OR LOWER(co.current_tools) LIKE '%hr%' OR LOWER(l.notes) LIKE '%hr software%')`);
          } else {
            sigClauses.push('(LOWER(co.hiring_signals) LIKE ? OR LOWER(l.notes) LIKE ? OR LOWER(l.qualification_notes) LIKE ?)');
            const term = `%${lower}%`;
            params.push(term, term, term);
          }
        }
        if (sigClauses.length > 0) {
          conditions.push(`(${sigClauses.join(' OR ')})`);
        }
      }
    }

    // Follow-up status filter
    if (options.followUpStatus && options.followUpStatus.trim()) {
      const fus = options.followUpStatus.trim().toLowerCase();
      if (fus === 'overdue') {
        conditions.push(`EXISTS (SELECT 1 FROM follow_ups fu WHERE fu.lead_id = l.id AND fu.status = 'Pending' AND date(fu.due_date) < date('now'))`);
      } else if (fus === 'today') {
        conditions.push(`EXISTS (SELECT 1 FROM follow_ups fu WHERE fu.lead_id = l.id AND fu.status = 'Pending' AND date(fu.due_date) = date('now'))`);
      } else if (fus === 'upcoming') {
        conditions.push(`EXISTS (SELECT 1 FROM follow_ups fu WHERE fu.lead_id = l.id AND fu.status = 'Pending' AND date(fu.due_date) > date('now'))`);
      } else if (fus === 'pending') {
        conditions.push(`EXISTS (SELECT 1 FROM follow_ups fu WHERE fu.lead_id = l.id AND fu.status = 'Pending')`);
      } else if (fus === 'completed') {
        conditions.push(`EXISTS (SELECT 1 FROM follow_ups fu WHERE fu.lead_id = l.id AND fu.status = 'Completed')`);
      } else if (fus === 'none') {
        conditions.push(`NOT EXISTS (SELECT 1 FROM follow_ups fu WHERE fu.lead_id = l.id)`);
      }
    }

    // Keyword search across relevant fields
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(l.title) LIKE ? OR
        LOWER(co.name) LIKE ? OR
        LOWER(cnt.name) LIKE ? OR
        LOWER(cnt.title) LIKE ? OR
        LOWER(cnt.email) LIKE ? OR
        LOWER(co.industry) LIKE ? OR
        LOWER(co.location) LIKE ? OR
        LOWER(l.notes) LIKE ? OR
        LOWER(l.qualification_notes) LIKE ? OR
        LOWER(l.existing_tools) LIKE ? OR
        LOWER(co.current_tools) LIKE ? OR
        LOWER(co.hiring_signals) LIKE ?
      )`);
      params.push(term, term, term, term, term, term, term, term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(DISTINCT l.id) AS total
      FROM leads l
      JOIN companies co ON l.company_id = co.id
      LEFT JOIN contacts cnt ON l.contact_id = cnt.id
      ${whereClause}
    `;
    const countRow = this.db.prepare(countSql).get(...params) as unknown as { total: number };
    const total = countRow ? countRow.total : 0;

    const allowedSortFields: Record<string, string> = {
      title: 'l.title',
      value: 'l.value',
      priority: 'CASE l.priority WHEN "High" THEN 3 WHEN "Medium" THEN 2 ELSE 1 END',
      score: 'l.qualification_score',
      status: 'l.status',
      company: 'co.name',
      createdAt: 'l.created_at',
      updatedAt: 'l.updated_at',
      stageChangedAt: 'l.stage_changed_at',
      hiringVolume: 'CASE l.hiring_volume WHEN "High" THEN 4 WHEN "Medium" THEN 3 WHEN "Low" THEN 2 ELSE 1 END',
    };

    const sortBy = options.sortBy && allowedSortFields[options.sortBy]
      ? allowedSortFields[options.sortBy]
      : 'l.qualification_score DESC, l.created_at DESC';

    const sortOrder = options.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderByClause = `ORDER BY ${sortBy} ${sortBy.includes(',') ? '' : sortOrder}`;

    const dataSql = `
      SELECT 
        l.id, l.company_id, l.contact_id, l.campaign_id, l.product, l.title, l.value, l.status, l.priority,
        l.hiring_volume, l.hiring_multiple_roles, l.manual_hr_processes, l.existing_tools,
        l.company_size, l.decision_maker_identified, l.qualification_score, l.qualification_notes,
        l.notes, l.source, l.referrer_name, l.referrer_contact, l.partner_name, l.referral_notes, l.ats_score,
        l.assigned_to, l.lost_reason, l.won_at, l.lost_at, l.stage_changed_at,
        l.created_at, l.updated_at,
        co.name AS company_name, co.website AS company_website, co.normalized_domain AS company_domain,
        co.industry AS company_industry, co.location AS company_location, co.employee_size AS company_employee_size,
        co.product_fit AS company_product_fit, co.current_tools AS company_current_tools, co.hiring_signals AS company_hiring_signals,
        cnt.name AS contact_name, cnt.title AS contact_title, cnt.email AS contact_email,
        cnt.phone AS contact_phone, cnt.decision_maker AS contact_decision_maker,
        cmp.name AS campaign_name,
        (
          SELECT 
            CASE 
              WHEN COUNT(fu.id) = 0 THEN 'None'
              WHEN SUM(CASE WHEN fu.status = 'Pending' AND date(fu.due_date) < date('now') THEN 1 ELSE 0 END) > 0 THEN 'Overdue'
              WHEN SUM(CASE WHEN fu.status = 'Pending' AND date(fu.due_date) = date('now') THEN 1 ELSE 0 END) > 0 THEN 'Today'
              WHEN SUM(CASE WHEN fu.status = 'Pending' AND date(fu.due_date) > date('now') THEN 1 ELSE 0 END) > 0 THEN 'Upcoming'
              WHEN SUM(CASE WHEN fu.status = 'Pending' THEN 1 ELSE 0 END) > 0 THEN 'Pending'
              WHEN SUM(CASE WHEN fu.status = 'Completed' THEN 1 ELSE 0 END) > 0 THEN 'Completed'
              ELSE 'None'
            END
          FROM follow_ups fu
          WHERE fu.lead_id = l.id
        ) AS computed_follow_up_status,
        (
          SELECT fu.due_date
          FROM follow_ups fu
          WHERE fu.lead_id = l.id
          ORDER BY CASE WHEN fu.status = 'Pending' THEN 0 ELSE 1 END, fu.due_date ASC
          LIMIT 1
        ) AS next_follow_up_due_date
      FROM leads l
      JOIN companies co ON l.company_id = co.id
      LEFT JOIN contacts cnt ON l.contact_id = cnt.id
      LEFT JOIN campaigns cmp ON l.campaign_id = cmp.id
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(dataSql).all(...params, limit, offset) as unknown as LeadWithRelationsRecord[];
    const items = rows.map((r) => this.mapRecordToLead(r));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Update lead and re-evaluate qualification if signals or contact changed.
   */
  public update(id: string, input: UpdateLeadInput): LeadDetailResponse {
    const existing = this.getById(id);
    if (!existing) {
      throw { status: 404, message: `Lead with ID "${id}" not found`, code: 'LEAD_NOT_FOUND' };
    }

    const companyId = input.companyId || existing.companyId;
    const contactId = input.contactId !== undefined ? input.contactId : existing.contactId;
    const product = input.product || existing.product;

    // Verify company if changed
    let company: CompanyRecord | undefined;
    if (input.companyId && input.companyId !== existing.companyId) {
      company = this.db
        .prepare('SELECT id, name, product_fit, employee_count, industry, employee_size FROM companies WHERE id = ?')
        .get(companyId) as unknown as CompanyRecord | undefined;
      if (!company) {
        throw { status: 404, message: `Company "${companyId}" not found`, code: 'COMPANY_NOT_FOUND' };
      }
    } else {
      company = this.db
        .prepare('SELECT id, name, product_fit, employee_count, industry, employee_size FROM companies WHERE id = ?')
        .get(companyId) as unknown as CompanyRecord | undefined;
    }

    // Verify contact if changed
    let contact: ContactRecord | undefined;
    if (contactId) {
      contact = this.db
        .prepare('SELECT id, company_id, name, title, department, decision_maker FROM contacts WHERE id = ?')
        .get(contactId) as unknown as ContactRecord | undefined;
      if (!contact) {
        throw { status: 404, message: `Contact "${contactId}" not found`, code: 'CONTACT_NOT_FOUND' };
      }
      if (contact.company_id !== companyId) {
        throw {
          status: 400,
          message: `Contact "${contact.name}" does not belong to company "${company?.name}"`,
          code: 'CONTACT_COMPANY_MISMATCH',
        };
      }
    }

    // Re-evaluate qualification
    const signals: QualificationSignalsInput = {
      product,
      hiringVolume: input.hiringVolume !== undefined ? input.hiringVolume : existing.hiringVolume,
      hiringMultipleRoles: input.hiringMultipleRoles !== undefined ? Boolean(input.hiringMultipleRoles) : existing.hiringMultipleRoles,
      manualHrProcesses: input.manualHrProcesses !== undefined ? Boolean(input.manualHrProcesses) : existing.manualHrProcesses,
      existingTools: input.existingTools !== undefined ? input.existingTools : existing.existingTools,
      companySize: input.companySize !== undefined ? input.companySize : existing.companySize,
      decisionMakerIdentified: Boolean(
        input.decisionMakerIdentified !== undefined
          ? input.decisionMakerIdentified
          : contact
          ? contact.decision_maker === 1
          : existing.decisionMakerIdentified
      ),
    };

    const qualResult = evaluateLeadQualification(
      signals,
      contact
        ? {
            id: contact.id,
            name: contact.name,
            title: contact.title,
            department: contact.department,
            decisionMaker: Boolean(contact.decision_maker),
          }
        : null,
      company
        ? {
            id: company.id,
            name: company.name,
            productFit: company.product_fit,
            employeeCount: company.employee_count,
            industry: company.industry,
          }
        : null
    );

    const { priority } = validateAndReconcilePriority(input.priority || existing.priority, qualResult);

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title.trim());
    }
    if (input.companyId !== undefined) {
      updates.push('company_id = ?');
      params.push(input.companyId);
    }
    if (input.contactId !== undefined) {
      updates.push('contact_id = ?');
      params.push(input.contactId || null);
    }
    if (input.product !== undefined) {
      updates.push('product = ?');
      params.push(input.product);
    }
    if (input.value !== undefined) {
      updates.push('value = ?');
      params.push(input.value);
    }
    if (input.status !== undefined && input.status !== existing.status) {
      const stageVal = validateStageTransition(existing.status, input.status, input.lostReason);
      if (!stageVal.isValid) {
        throw {
          status: 400,
          message: stageVal.reason || 'Invalid stage transition',
          code: 'INVALID_STAGE_TRANSITION',
        };
      }
      updates.push('status = ?');
      params.push(input.status);

      updates.push("stage_changed_at = datetime('now')");

      if (stageVal.isWon) {
        updates.push("won_at = datetime('now')");
      }
      if (stageVal.isLost) {
        updates.push("lost_at = datetime('now')");
        updates.push('lost_reason = ?');
        params.push(input.lostReason || 'Unspecified');
      }

      this.recordStageHistory(
        id,
        existing.status,
        input.status,
        input.assignedTo || existing.assignedTo,
        input.notes || 'Stage updated via lead edit',
        stageVal.isLost ? input.lostReason : null
      );
    }

    // Set updated priority, signals and score
    updates.push('priority = ?');
    params.push(priority);

    updates.push('hiring_volume = ?');
    params.push(signals.hiringVolume);

    updates.push('hiring_multiple_roles = ?');
    params.push(signals.hiringMultipleRoles ? 1 : 0);

    updates.push('manual_hr_processes = ?');
    params.push(signals.manualHrProcesses ? 1 : 0);

    if (input.existingTools !== undefined) {
      updates.push('existing_tools = ?');
      params.push(input.existingTools);
    }

    if (input.companySize !== undefined) {
      updates.push('company_size = ?');
      params.push(input.companySize);
    }

    updates.push('decision_maker_identified = ?');
    params.push(signals.decisionMakerIdentified ? 1 : 0);

    updates.push('qualification_score = ?');
    params.push(qualResult.score);

    updates.push('qualification_notes = ?');
    params.push(input.qualificationNotes !== undefined ? input.qualificationNotes : qualResult.qualificationNotes);

    if (input.notes !== undefined) {
      updates.push('notes = ?');
      params.push(input.notes);
    }
    if (input.source !== undefined) {
      updates.push('source = ?');
      params.push(input.source);
    }
    if (input.campaignId !== undefined) {
      updates.push('campaign_id = ?');
      params.push(input.campaignId || null);
    }
    if (input.referrerName !== undefined) {
      updates.push('referrer_name = ?');
      params.push(input.referrerName || null);
    }
    if (input.referrerContact !== undefined) {
      updates.push('referrer_contact = ?');
      params.push(input.referrerContact || null);
    }
    if (input.partnerName !== undefined) {
      updates.push('partner_name = ?');
      params.push(input.partnerName || null);
    }
    if (input.referralNotes !== undefined) {
      updates.push('referral_notes = ?');
      params.push(input.referralNotes || null);
    }
    if (input.atsScore !== undefined) {
      updates.push('ats_score = ?');
      params.push(input.atsScore !== null ? Number(input.atsScore) : null);
    }
    if (input.assignedTo !== undefined) {
      updates.push('assigned_to = ?');
      params.push(input.assignedTo);
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    const updateSql = `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(updateSql).run(...params);

    return this.getById(id)!;
  }

  /**
   * Dedicated stage change interaction method with transition validation and history logging.
   */
  public changeStage(id: string, input: StageChangeInput): LeadDetailResponse {
    const existing = this.getById(id);
    if (!existing) {
      throw { status: 404, message: `Lead with ID "${id}" not found`, code: 'LEAD_NOT_FOUND' };
    }

    const { stage, notes, lostReason, changedBy } = input;

    // Validate transition
    const validation = validateStageTransition(existing.status, stage, lostReason);
    if (!validation.isValid) {
      throw {
        status: 400,
        message: validation.reason || 'Invalid stage transition',
        code: 'INVALID_STAGE_TRANSITION',
      };
    }

    const updates: string[] = ['status = ?', "stage_changed_at = datetime('now')", "updated_at = datetime('now')"];
    const params: (string | null)[] = [stage];

    if (validation.isWon) {
      updates.push("won_at = datetime('now')");
    } else if (existing.status === 'Won' && stage !== 'Won') {
      updates.push('won_at = NULL');
    }

    if (validation.isLost) {
      updates.push("lost_at = datetime('now')");
      updates.push('lost_reason = ?');
      params.push(lostReason || null);
    } else if (existing.status === 'Lost' && stage !== 'Lost') {
      updates.push('lost_at = NULL');
      updates.push('lost_reason = NULL');
    }

    if (notes && notes.trim()) {
      updates.push('notes = ?');
      params.push(notes.trim());
    }

    params.push(id);

    const updateSql = `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(updateSql).run(...params);

    // Record activity / history record
    this.recordStageHistory(
      id,
      existing.status,
      stage,
      changedBy || null,
      notes || `Stage transitioned from ${existing.status} to ${stage}`,
      validation.isLost ? lostReason : null
    );

    return this.getById(id)!;
  }

  /**
   * Record lead stage change into lead_stage_history table.
   */
  public recordStageHistory(
    leadId: string,
    fromStage: LeadStageType | null,
    toStage: LeadStageType,
    changedBy?: string | null,
    notes?: string | null,
    lostReason?: string | null
  ): void {
    const id = `hist_${crypto.randomBytes(6).toString('hex')}`;
    this.db
      .prepare(`
        INSERT INTO lead_stage_history (id, lead_id, from_stage, to_stage, changed_by, notes, lost_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .run(id, leadId, fromStage || null, toStage, changedBy || null, notes || null, lostReason || null);
  }

  /**
   * Get leads grouped by stage for Kanban board view.
   */
  public getPipelineGrouped(filter: LeadFilterOptions = {}): LeadPipelineStageGroup[] {
    const listResult = this.list({ ...filter, limit: 1000, page: 1 });
    const allLeads = listResult.items;

    const stages = PIPELINE_STAGES;
    const stageMap = new Map<LeadStageType, LeadDetailResponse[]>();
    for (const st of stages) {
      stageMap.set(st, []);
    }

    for (const lead of allLeads) {
      if (stageMap.has(lead.status)) {
        stageMap.get(lead.status)!.push(lead);
      }
    }

    return stages.map((st) => {
      const items = stageMap.get(st) || [];
      const totalValue = items.reduce((sum, l) => sum + (l.value || 0), 0);
      return {
        stage: st,
        count: items.length,
        totalValue,
        leads: items,
      };
    });
  }

  /**
   * Delete or soft-archive a lead.
   */
  public delete(id: string, permanent = false): { message: string } {
    const existing = this.getById(id);
    if (!existing) {
      throw { status: 404, message: `Lead with ID "${id}" not found`, code: 'LEAD_NOT_FOUND' };
    }

    if (permanent) {
      this.db.prepare('DELETE FROM leads WHERE id = ?').run(id);
      return { message: `Lead "${existing.title}" permanently deleted` };
    } else {
      this.db
        .prepare("UPDATE leads SET status = 'Archived', updated_at = datetime('now') WHERE id = ?")
        .run(id);
      return { message: `Lead "${existing.title}" moved to archive` };
    }
  }
}
