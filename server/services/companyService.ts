import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import { CompanyRecord, ContactRecord, LeadRecord } from '../db/types';

export interface CreateCompanyInput {
  name: string;
  website: string;
  industry: string;
  location: string;
  employeeSize: string;
  employeeCount?: number;
  hiringSignals?: string;
  currentTools?: string;
  productFit?: 'High' | 'Medium' | 'Low';
  leadRelevanceScore?: number;
  notes?: string;
  status?: 'Prospect' | 'Researching' | 'Contacted' | 'Qualified' | 'Customer' | 'Archived' | 'Unqualified';
}

export interface UpdateCompanyInput {
  name?: string;
  website?: string;
  industry?: string;
  location?: string;
  employeeSize?: string;
  employeeCount?: number;
  hiringSignals?: string;
  currentTools?: string;
  productFit?: 'High' | 'Medium' | 'Low';
  leadRelevanceScore?: number;
  notes?: string;
  status?: 'Prospect' | 'Researching' | 'Contacted' | 'Qualified' | 'Customer' | 'Archived' | 'Unqualified';
}

export interface CompanyFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  location?: string;
  status?: string;
  employeeSize?: string;
  productFit?: string;
  includeArchived?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CompanyDetailResponse {
  id: string;
  name: string;
  website: string;
  domain: string;
  industry: string;
  location: string;
  employeeSize: string;
  employeeCount: number;
  hiringSignals: string | null;
  currentTools: string | null;
  productFit: 'High' | 'Medium' | 'Low';
  leadRelevanceScore: number;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  contacts?: ContactRecord[];
  leads?: LeadRecord[];
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function extractDomain(website: string): string {
  let cleaned = website.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split('?')[0];
  return cleaned;
}

export class CompanyService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  private mapRecordToCompany(row: CompanyRecord): CompanyDetailResponse {
    return {
      id: row.id,
      name: row.name,
      website: row.website,
      domain: row.normalized_domain,
      industry: row.industry,
      location: row.location,
      employeeSize: row.employee_size,
      employeeCount: row.employee_count,
      hiringSignals: row.hiring_signals,
      currentTools: row.current_tools,
      productFit: row.product_fit,
      leadRelevanceScore: row.lead_relevance_score,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  create(input: CreateCompanyInput, userId?: string): CompanyDetailResponse {
    const normName = normalizeName(input.name);
    const normDomain = extractDomain(input.website);

    // 1. Check duplicate name
    const existingName = this.db.prepare(`
      SELECT id, name FROM companies
      WHERE normalized_name = ? AND status != 'Archived'
    `).get(normName) as unknown as { id: string; name: string } | undefined;

    if (existingName) {
      throw {
        status: 409,
        message: `A company with name '${input.name}' already exists.`,
        code: 'DUPLICATE_COMPANY_NAME',
      };
    }

    // 2. Check duplicate domain
    const existingDomain = this.db.prepare(`
      SELECT id, name, website FROM companies
      WHERE normalized_domain = ? AND status != 'Archived'
    `).get(normDomain) as unknown as { id: string; name: string } | undefined;

    if (existingDomain) {
      throw {
        status: 409,
        message: `A company with domain/website '${normDomain}' already exists (${existingDomain.name}).`,
        code: 'DUPLICATE_COMPANY_DOMAIN',
      };
    }

    const id = 'cmp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const productFit = input.productFit || 'Medium';

    // Calculate intelligent default relevance score if not specified
    let relevanceScore = input.leadRelevanceScore;
    if (relevanceScore === undefined) {
      relevanceScore = productFit === 'High' ? 85 : productFit === 'Medium' ? 70 : 50;
      if (input.hiringSignals && input.hiringSignals.length > 5) {
        relevanceScore = Math.min(100, relevanceScore + 10);
      }
    }

    const employeeCount = input.employeeCount !== undefined
      ? input.employeeCount
      : parseInt(input.employeeSize.replace(/[^0-9]/g, ''), 10) || 50;

    const status = input.status || 'Prospect';

    this.db.prepare(`
      INSERT INTO companies (
        id, name, normalized_name, website, normalized_domain, industry, location,
        employee_size, employee_count, hiring_signals, current_tools, product_fit,
        lead_relevance_score, notes, status, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      id,
      input.name.trim(),
      normName,
      input.website.trim(),
      normDomain,
      input.industry.trim(),
      input.location.trim(),
      input.employeeSize.trim(),
      employeeCount,
      input.hiringSignals ? input.hiringSignals.trim() : null,
      input.currentTools ? input.currentTools.trim() : null,
      productFit,
      relevanceScore,
      input.notes ? input.notes.trim() : null,
      status,
      userId || null
    );

    const created = this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as unknown as CompanyRecord;
    return this.mapRecordToCompany(created);
  }

  list(options: CompanyFilterOptions = {}): {
    items: CompanyDetailResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Filter out archived by default unless requested
    if (!options.includeArchived && options.status !== 'Archived') {
      conditions.push("status != 'Archived'");
    }

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    if (options.industry) {
      conditions.push('industry = ?');
      params.push(options.industry);
    }

    if (options.location) {
      conditions.push('location LIKE ?');
      params.push(`%${options.location}%`);
    }

    if (options.employeeSize) {
      conditions.push('employee_size = ?');
      params.push(options.employeeSize);
    }

    if (options.productFit) {
      conditions.push('product_fit = ?');
      params.push(options.productFit);
    }

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      conditions.push(`(
        name LIKE ? OR
        website LIKE ? OR
        industry LIKE ? OR
        location LIKE ? OR
        current_tools LIKE ? OR
        hiring_signals LIKE ? OR
        notes LIKE ?
      )`);
      params.push(term, term, term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortFields: Record<string, string> = {
      name: 'name',
      industry: 'industry',
      location: 'location',
      employeeSize: 'employee_count',
      employeeCount: 'employee_count',
      productFit: 'product_fit',
      leadRelevanceScore: 'lead_relevance_score',
      status: 'status',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    const sortByCol = allowedSortFields[options.sortBy || 'createdAt'] || 'created_at';
    const sortDir = (options.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Total count query
    const countQuery = `SELECT COUNT(*) as count FROM companies ${whereClause}`;
    const totalRow = this.db.prepare(countQuery).get(...params) as unknown as { count: number };
    const total = totalRow ? totalRow.count : 0;

    // Items query with pagination
    const itemsQuery = `
      SELECT * FROM companies
      ${whereClause}
      ORDER BY ${sortByCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;
    const rows = this.db.prepare(itemsQuery).all(...params, limit, offset) as unknown as CompanyRecord[];
    const items = rows.map((r) => this.mapRecordToCompany(r));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  getById(id: string): CompanyDetailResponse | null {
    const row = this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as unknown as CompanyRecord | undefined;
    if (!row) return null;

    const company = this.mapRecordToCompany(row);

    // Fetch related contacts
    const contacts = this.db.prepare(`
      SELECT * FROM contacts WHERE company_id = ? ORDER BY decision_maker DESC, name ASC
    `).all(id) as unknown as ContactRecord[];

    // Fetch related leads
    const leads = this.db.prepare(`
      SELECT * FROM leads WHERE company_id = ? ORDER BY created_at DESC
    `).all(id) as unknown as LeadRecord[];

    company.contacts = contacts;
    company.leads = leads;

    return company;
  }

  update(id: string, updates: UpdateCompanyInput): CompanyDetailResponse {
    const existing = this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as unknown as CompanyRecord | undefined;
    if (!existing) {
      throw { status: 404, message: 'Company not found', code: 'COMPANY_NOT_FOUND' };
    }

    // Check duplicate name if name changed
    if (updates.name && normalizeName(updates.name) !== existing.normalized_name) {
      const normName = normalizeName(updates.name);
      const duplicate = this.db.prepare(`
        SELECT id FROM companies WHERE normalized_name = ? AND id != ? AND status != 'Archived'
      `).get(normName, id) as unknown as { id: string } | undefined;
      if (duplicate) {
        throw {
          status: 409,
          message: `Another company with name '${updates.name}' already exists.`,
          code: 'DUPLICATE_COMPANY_NAME',
        };
      }
    }

    // Check duplicate website/domain if website changed
    if (updates.website && extractDomain(updates.website) !== existing.normalized_domain) {
      const normDomain = extractDomain(updates.website);
      const duplicate = this.db.prepare(`
        SELECT id, name FROM companies WHERE normalized_domain = ? AND id != ? AND status != 'Archived'
      `).get(normDomain, id) as unknown as { id: string; name: string } | undefined;
      if (duplicate) {
        throw {
          status: 409,
          message: `Another company with domain '${normDomain}' already exists (${duplicate.name}).`,
          code: 'DUPLICATE_COMPANY_DOMAIN',
        };
      }
    }

    const setClauses: string[] = ['updated_at = datetime(\'now\')'];
    const params: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?', 'normalized_name = ?');
      params.push(updates.name.trim(), normalizeName(updates.name));
    }
    if (updates.website !== undefined) {
      setClauses.push('website = ?', 'normalized_domain = ?');
      params.push(updates.website.trim(), extractDomain(updates.website));
    }
    if (updates.industry !== undefined) {
      setClauses.push('industry = ?');
      params.push(updates.industry.trim());
    }
    if (updates.location !== undefined) {
      setClauses.push('location = ?');
      params.push(updates.location.trim());
    }
    if (updates.employeeSize !== undefined) {
      setClauses.push('employee_size = ?');
      params.push(updates.employeeSize.trim());
    }
    if (updates.employeeCount !== undefined) {
      setClauses.push('employee_count = ?');
      params.push(updates.employeeCount);
    }
    if (updates.hiringSignals !== undefined) {
      setClauses.push('hiring_signals = ?');
      params.push(updates.hiringSignals ? updates.hiringSignals.trim() : null);
    }
    if (updates.currentTools !== undefined) {
      setClauses.push('current_tools = ?');
      params.push(updates.currentTools ? updates.currentTools.trim() : null);
    }
    if (updates.productFit !== undefined) {
      setClauses.push('product_fit = ?');
      params.push(updates.productFit);
    }
    if (updates.leadRelevanceScore !== undefined) {
      setClauses.push('lead_relevance_score = ?');
      params.push(updates.leadRelevanceScore);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      params.push(updates.notes ? updates.notes.trim() : null);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    const sql = `UPDATE companies SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params, id);

    const updated = this.getById(id);
    if (!updated) {
      throw { status: 500, message: 'Failed to retrieve updated company' };
    }
    return updated;
  }

  archive(id: string): CompanyDetailResponse {
    return this.update(id, { status: 'Archived' });
  }

  delete(id: string, permanent = false): { success: boolean; message: string } {
    const existing = this.db.prepare('SELECT id, name FROM companies WHERE id = ?').get(id) as unknown as { id: string; name: string } | undefined;
    if (!existing) {
      throw { status: 404, message: 'Company not found', code: 'COMPANY_NOT_FOUND' };
    }

    if (permanent) {
      this.db.prepare('DELETE FROM companies WHERE id = ?').run(id);
      return { success: true, message: `Company '${existing.name}' permanently deleted.` };
    } else {
      this.archive(id);
      return { success: true, message: `Company '${existing.name}' archived successfully.` };
    }
  }
}
