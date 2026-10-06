import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import { ContactRecord, ContactWithCompanyRecord, LeadRecord, CompanyRecord } from '../db/types';

export interface CreateContactInput {
  name: string;
  companyId: string;
  title: string;
  email?: string;
  phone?: string;
  department?: string;
  decisionMaker?: boolean | number;
  linkedinUrl?: string;
  notes?: string;
  status?: 'Active' | 'Contacted' | 'Qualified' | 'Unresponsive' | 'Archived';
  allowDuplicate?: boolean;
}

export interface UpdateContactInput {
  name?: string;
  companyId?: string;
  title?: string;
  email?: string;
  phone?: string;
  department?: string;
  decisionMaker?: boolean | number;
  linkedinUrl?: string;
  notes?: string;
  status?: 'Active' | 'Contacted' | 'Qualified' | 'Unresponsive' | 'Archived';
  allowDuplicate?: boolean;
}

export interface ContactFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  jobTitle?: string;
  title?: string;
  companyId?: string;
  company?: string;
  decisionMaker?: boolean | string;
  status?: string;
  includeArchived?: boolean;
  productRelevance?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactDetailResponse {
  id: string;
  companyId: string;
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  companyIndustry?: string;
  companyLocation?: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string;
  department: string | null;
  decisionMaker: boolean;
  linkedinUrl: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  leads?: LeadRecord[];
}

export interface PaginatedContactsResult {
  items: ContactDetailResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export class ContactService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  private mapRecordToContact(
    row: ContactWithCompanyRecord,
    leads?: LeadRecord[]
  ): ContactDetailResponse {
    return {
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      companyWebsite: row.company_website,
      companyDomain: row.company_domain,
      companyIndustry: row.company_industry,
      companyLocation: row.company_location,
      name: row.name,
      email: row.email,
      phone: row.phone,
      title: row.title,
      department: row.department,
      decisionMaker: Boolean(row.decision_maker),
      linkedinUrl: row.linkedin_url,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      leads: leads || [],
    };
  }

  /**
   * Check for duplicate contacts by email.
   * Useful for real-time frontend duplicate-warning UX.
   */
  public checkDuplicate(
    email: string,
    companyId?: string,
    excludeContactId?: string
  ): { isDuplicate: boolean; existingContact?: { id: string; name: string; email: string; companyName: string } } {
    if (!email || !email.trim()) {
      return { isDuplicate: false };
    }

    const cleanEmail = email.trim().toLowerCase();
    let query = `
      SELECT c.id, c.name, c.email, co.name AS company_name
      FROM contacts c
      JOIN companies co ON c.company_id = co.id
      WHERE LOWER(c.email) = ?
    `;
    const params: (string | number)[] = [cleanEmail];

    if (excludeContactId) {
      query += ` AND c.id != ?`;
      params.push(excludeContactId);
    }

    if (companyId) {
      query += ` AND c.company_id = ?`;
      params.push(companyId);
    }

    const row = this.db.prepare(query).get(...params) as unknown as
      | { id: string; name: string; email: string; company_name: string }
      | undefined;

    if (row) {
      return {
        isDuplicate: true,
        existingContact: {
          id: row.id,
          name: row.name,
          email: row.email,
          companyName: row.company_name,
        },
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Create a new contact with relationship integrity and validation.
   */
  public create(input: CreateContactInput): ContactDetailResponse {
    const name = input.name?.trim();
    if (!name) {
      throw {
        status: 400,
        message: 'Contact name is required',
        code: 'VALIDATION_ERROR',
      };
    }

    const title = input.title?.trim();
    if (!title) {
      throw {
        status: 400,
        message: 'Job title is required',
        code: 'VALIDATION_ERROR',
      };
    }

    const companyId = input.companyId?.trim();
    if (!companyId) {
      throw {
        status: 400,
        message: 'Company association (companyId) is required',
        code: 'VALIDATION_ERROR',
      };
    }

    // Verify company exists to prevent broken company references
    const company = this.db
      .prepare('SELECT id, name FROM companies WHERE id = ?')
      .get(companyId) as unknown as CompanyRecord | undefined;

    if (!company) {
      throw {
        status: 404,
        message: `Associated company with ID "${companyId}" does not exist`,
        code: 'COMPANY_NOT_FOUND',
      };
    }

    // Email format validation
    let email: string | null = null;
    if (input.email && input.email.trim()) {
      const trimmedEmail = input.email.trim();
      if (!isValidEmail(trimmedEmail)) {
        throw {
          status: 400,
          message: 'Invalid email address format',
          code: 'INVALID_EMAIL_FORMAT',
        };
      }
      email = trimmedEmail.toLowerCase();

      // Duplicate check
      if (!input.allowDuplicate) {
        const dupCheck = this.checkDuplicate(email);
        if (dupCheck.isDuplicate && dupCheck.existingContact) {
          throw {
            status: 409,
            message: `A contact with email "${email}" already exists: ${dupCheck.existingContact.name} at ${dupCheck.existingContact.companyName}`,
            code: 'DUPLICATE_CONTACT_EMAIL',
            duplicateContact: dupCheck.existingContact,
          };
        }
      }
    }

    const id = `cnt_${crypto.randomBytes(6).toString('hex')}`;
    const phone = input.phone?.trim() || null;
    const department = input.department?.trim() || null;
    const decisionMaker = input.decisionMaker ? 1 : 0;
    const linkedinUrl = input.linkedinUrl?.trim() || null;
    const notes = input.notes?.trim() || null;
    const status = input.status || 'Active';

    const insertStmt = this.db.prepare(`
      INSERT INTO contacts (
        id, company_id, name, email, phone, title, department,
        decision_maker, linkedin_url, notes, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    insertStmt.run(
      id,
      companyId,
      name,
      email,
      phone,
      title,
      department,
      decisionMaker,
      linkedinUrl,
      notes,
      status
    );

    return this.getById(id)!;
  }

  /**
   * Get contact by ID with Company details and associated Leads.
   */
  public getById(id: string): ContactDetailResponse | null {
    const contactRow = this.db
      .prepare(`
        SELECT 
          c.id, c.company_id, c.name, c.email, c.phone, c.title, c.department,
          c.decision_maker, c.linkedin_url, c.notes, c.status, c.created_at, c.updated_at,
          co.name AS company_name, co.website AS company_website, co.normalized_domain AS company_domain,
          co.industry AS company_industry, co.location AS company_location
        FROM contacts c
        JOIN companies co ON c.company_id = co.id
        WHERE c.id = ?
      `)
      .get(id) as unknown as ContactWithCompanyRecord | undefined;

    if (!contactRow) {
      return null;
    }

    // Get associated leads
    const leads = this.db
      .prepare(`
        SELECT id, company_id, contact_id, title, value, status, priority, source, assigned_to, created_at, updated_at
        FROM leads
        WHERE contact_id = ?
        ORDER BY created_at DESC
      `)
      .all(id) as unknown as LeadRecord[];

    return this.mapRecordToContact(contactRow, leads);
  }

  /**
   * List contacts with search, filtering by role/company/decision-maker, sorting and pagination.
   */
  public list(options: ContactFilterOptions = {}): PaginatedContactsResult {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Filter by archived status
    if (!options.includeArchived) {
      if (options.status) {
        conditions.push('c.status = ?');
        params.push(options.status);
      } else {
        conditions.push("c.status != 'Archived'");
      }
    } else if (options.status) {
      conditions.push('c.status = ?');
      params.push(options.status);
    }

    // Filter by company
    if (options.companyId) {
      conditions.push('c.company_id = ?');
      params.push(options.companyId);
    }

    if (options.company) {
      conditions.push('(LOWER(co.name) LIKE ? OR co.id = ?)');
      params.push(`%${options.company.toLowerCase()}%`, options.company);
    }

    // Filter by role / title (e.g. "Recruitment", "HR", "CEO", "Finance", "IT")
    if (options.role) {
      conditions.push('(c.title LIKE ? OR c.department LIKE ?)');
      params.push(`%${options.role}%`, `%${options.role}%`);
    }

    const titleFilter = options.jobTitle || options.title;
    if (titleFilter) {
      conditions.push('LOWER(c.title) LIKE ?');
      params.push(`%${titleFilter.toLowerCase()}%`);
    }

    if (options.productRelevance) {
      conditions.push(`(
        co.product_fit = ? OR
        EXISTS (SELECT 1 FROM leads ld WHERE ld.contact_id = c.id AND ld.product = ?)
      )`);
      params.push(options.productRelevance, options.productRelevance);
    }

    // Filter by decision-maker status
    if (options.decisionMaker !== undefined) {
      const isDm =
        options.decisionMaker === true ||
        options.decisionMaker === 'true' ||
        options.decisionMaker === 1 ||
        options.decisionMaker === '1';
      conditions.push('c.decision_maker = ?');
      params.push(isDm ? 1 : 0);
    }

    // Search query across name, email, job title, company name, notes
    if (options.search && options.search.trim()) {
      const searchTerm = `%${options.search.trim()}%`;
      conditions.push(`
        (c.name LIKE ? OR c.email LIKE ? OR c.title LIKE ? OR co.name LIKE ? OR c.notes LIKE ?)
      `);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM contacts c
      JOIN companies co ON c.company_id = co.id
      ${whereClause}
    `;
    const countRow = this.db.prepare(countSql).get(...params) as unknown as { total: number };
    const total = countRow ? countRow.total : 0;

    // Sorting
    const allowedSortFields: Record<string, string> = {
      name: 'c.name',
      title: 'c.title',
      company: 'co.name',
      decisionMaker: 'c.decision_maker',
      status: 'c.status',
      createdAt: 'c.created_at',
      updatedAt: 'c.updated_at',
    };

    const sortBy = options.sortBy && allowedSortFields[options.sortBy]
      ? allowedSortFields[options.sortBy]
      : 'c.decision_maker DESC, c.created_at DESC';

    const sortOrder = options.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderByClause = `ORDER BY ${sortBy} ${sortBy.includes(',') ? '' : sortOrder}`;

    // Query paginated items
    const dataSql = `
      SELECT 
        c.id, c.company_id, c.name, c.email, c.phone, c.title, c.department,
        c.decision_maker, c.linkedin_url, c.notes, c.status, c.created_at, c.updated_at,
        co.name AS company_name, co.website AS company_website, co.normalized_domain AS company_domain,
        co.industry AS company_industry, co.location AS company_location
      FROM contacts c
      JOIN companies co ON c.company_id = co.id
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(dataSql).all(...params, limit, offset) as unknown as ContactWithCompanyRecord[];

    const items = rows.map((r) => this.mapRecordToContact(r));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Update contact attributes.
   */
  public update(id: string, input: UpdateContactInput): ContactDetailResponse {
    const existing = this.db
      .prepare('SELECT id, company_id, email FROM contacts WHERE id = ?')
      .get(id) as unknown as ContactRecord | undefined;

    if (!existing) {
      throw {
        status: 404,
        message: `Contact with ID "${id}" not found`,
        code: 'CONTACT_NOT_FOUND',
      };
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw { status: 400, message: 'Contact name cannot be empty', code: 'VALIDATION_ERROR' };
      }
      updates.push('name = ?');
      params.push(name);
    }

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw { status: 400, message: 'Job title cannot be empty', code: 'VALIDATION_ERROR' };
      }
      updates.push('title = ?');
      params.push(title);
    }

    if (input.companyId !== undefined) {
      const companyId = input.companyId.trim();
      // Verify company exists
      const company = this.db
        .prepare('SELECT id FROM companies WHERE id = ?')
        .get(companyId) as unknown as CompanyRecord | undefined;

      if (!company) {
        throw {
          status: 404,
          message: `Referenced company with ID "${companyId}" does not exist`,
          code: 'COMPANY_NOT_FOUND',
        };
      }

      updates.push('company_id = ?');
      params.push(companyId);
    }

    if (input.email !== undefined) {
      let email: string | null = null;
      if (input.email && input.email.trim()) {
        const trimmedEmail = input.email.trim();
        if (!isValidEmail(trimmedEmail)) {
          throw { status: 400, message: 'Invalid email address format', code: 'INVALID_EMAIL_FORMAT' };
        }
        email = trimmedEmail.toLowerCase();

        // Check duplicate email
        if (!input.allowDuplicate) {
          const dup = this.checkDuplicate(email, undefined, id);
          if (dup.isDuplicate && dup.existingContact) {
            throw {
              status: 409,
              message: `Email "${email}" is already used by ${dup.existingContact.name} at ${dup.existingContact.companyName}`,
              code: 'DUPLICATE_CONTACT_EMAIL',
              duplicateContact: dup.existingContact,
            };
          }
        }
      }
      updates.push('email = ?');
      params.push(email);
    }

    if (input.phone !== undefined) {
      updates.push('phone = ?');
      params.push(input.phone?.trim() || null);
    }

    if (input.department !== undefined) {
      updates.push('department = ?');
      params.push(input.department?.trim() || null);
    }

    if (input.decisionMaker !== undefined) {
      updates.push('decision_maker = ?');
      params.push(input.decisionMaker ? 1 : 0);
    }

    if (input.linkedinUrl !== undefined) {
      updates.push('linkedin_url = ?');
      params.push(input.linkedinUrl?.trim() || null);
    }

    if (input.notes !== undefined) {
      updates.push('notes = ?');
      params.push(input.notes?.trim() || null);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (updates.length === 0) {
      return this.getById(id)!;
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    const updateSql = `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(updateSql).run(...params);

    return this.getById(id)!;
  }

  /**
   * Fast toggle for Decision Maker flag.
   */
  public toggleDecisionMaker(id: string, decisionMaker?: boolean): ContactDetailResponse {
    const existing = this.db
      .prepare('SELECT id, decision_maker FROM contacts WHERE id = ?')
      .get(id) as unknown as ContactRecord | undefined;

    if (!existing) {
      throw {
        status: 404,
        message: `Contact with ID "${id}" not found`,
        code: 'CONTACT_NOT_FOUND',
      };
    }

    const nextVal = decisionMaker !== undefined ? (decisionMaker ? 1 : 0) : (existing.decision_maker === 1 ? 0 : 1);

    this.db
      .prepare("UPDATE contacts SET decision_maker = ?, updated_at = datetime('now') WHERE id = ?")
      .run(nextVal, id);

    return this.getById(id)!;
  }

  /**
   * Archive or permanently delete a contact.
   */
  public delete(id: string, permanent = false): { message: string } {
    const existing = this.db
      .prepare('SELECT id, name FROM contacts WHERE id = ?')
      .get(id) as unknown as ContactRecord | undefined;

    if (!existing) {
      throw {
        status: 404,
        message: `Contact with ID "${id}" not found`,
        code: 'CONTACT_NOT_FOUND',
      };
    }

    if (permanent) {
      this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
      return { message: `Contact "${existing.name}" permanently deleted` };
    } else {
      this.db
        .prepare("UPDATE contacts SET status = 'Archived', updated_at = datetime('now') WHERE id = ?")
        .run(id);
      return { message: `Contact "${existing.name}" moved to archive` };
    }
  }
}
