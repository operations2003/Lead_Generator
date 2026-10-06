import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import { OutreachTemplateRecord, OutreachTemplateType } from '../db/types';

export const VALID_TEMPLATE_TYPES: OutreachTemplateType[] = [
  'Initial Email',
  'LinkedIn Message',
  'Follow-up Email',
  'Call Script',
  'WhatsApp Message',
  'Demo Follow-up',
  'Final Follow-up',
  'Email',
  'LinkedIn',
  'Phone',
  'WhatsApp',
  'Other',
];

export interface CreateTemplateInput {
  name: string;
  type: OutreachTemplateType;
  product?: string;
  subject?: string | null;
  body: string;
  sequenceDay?: number | null;
}

export interface UpdateTemplateInput {
  name?: string;
  type?: OutreachTemplateType;
  product?: string;
  subject?: string | null;
  body?: string;
  sequenceDay?: number | null;
  status?: 'Active' | 'Archived';
}

export interface TemplateFilterOptions {
  type?: OutreachTemplateType;
  product?: string;
  status?: 'Active' | 'Archived';
  search?: string;
}

export class TemplateService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  getTemplates(options: TemplateFilterOptions = {}): OutreachTemplateRecord[] {
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (options.status) {
      whereClauses.push('status = ?');
      params.push(options.status);
    } else {
      whereClauses.push("status = 'Active'");
    }

    if (options.type) {
      whereClauses.push('type = ?');
      params.push(options.type);
    }

    if (options.product) {
      whereClauses.push("(product = ? OR product = 'Both' OR ? = 'Both')");
      params.push(options.product, options.product);
    }

    if (options.search && options.search.trim()) {
      whereClauses.push('(name LIKE ? OR subject LIKE ? OR body LIKE ?)');
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const rows = this.db.prepare(`
      SELECT * FROM outreach_templates
      ${whereSql}
      ORDER BY 
        CASE WHEN sequence_day IS NOT NULL THEN sequence_day ELSE 999 END ASC,
        created_at DESC
    `).all(...params) as unknown as OutreachTemplateRecord[];

    return rows;
  }

  getTemplateById(id: string): OutreachTemplateRecord | null {
    const row = this.db.prepare('SELECT * FROM outreach_templates WHERE id = ?').get(id) as unknown as OutreachTemplateRecord | undefined;
    return row || null;
  }

  createTemplate(input: CreateTemplateInput, userId?: string): OutreachTemplateRecord {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Template name is required');
    }
    if (!input.type || !VALID_TEMPLATE_TYPES.includes(input.type)) {
      throw new Error(`Valid template type is required: ${VALID_TEMPLATE_TYPES.join(', ')}`);
    }
    if (!input.body || input.body.trim().length === 0) {
      throw new Error('Template body is required');
    }

    const id = `tmpl-${crypto.randomUUID()}`;
    const product = input.product?.trim() || 'Both';

    this.db.prepare(`
      INSERT INTO outreach_templates (
        id, name, type, product, subject, body, sequence_day,
        created_by, updated_by, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))
    `).run(
      id,
      input.name.trim(),
      input.type,
      product,
      input.subject?.trim() || null,
      input.body.trim(),
      input.sequenceDay !== undefined ? input.sequenceDay : null,
      userId || null,
      userId || null
    );

    const created = this.getTemplateById(id);
    if (!created) {
      throw new Error('Failed to retrieve newly created template');
    }
    return created;
  }

  updateTemplate(id: string, input: UpdateTemplateInput, userId?: string): OutreachTemplateRecord {
    const existing = this.getTemplateById(id);
    if (!existing) {
      throw new Error(`Template with id "${id}" not found`);
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      if (!input.name.trim()) throw new Error('Template name cannot be empty');
      updates.push('name = ?');
      params.push(input.name.trim());
    }
    if (input.type !== undefined) {
      if (!VALID_TEMPLATE_TYPES.includes(input.type)) {
        throw new Error(`Invalid template type: ${input.type}`);
      }
      updates.push('type = ?');
      params.push(input.type);
    }
    if (input.product !== undefined) {
      updates.push('product = ?');
      params.push(input.product.trim() || 'Both');
    }
    if (input.subject !== undefined) {
      updates.push('subject = ?');
      params.push(input.subject?.trim() || null);
    }
    if (input.body !== undefined) {
      if (!input.body.trim()) throw new Error('Template body cannot be empty');
      updates.push('body = ?');
      params.push(input.body.trim());
    }
    if (input.sequenceDay !== undefined) {
      updates.push('sequence_day = ?');
      params.push(input.sequenceDay);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push("updated_at = datetime('now')");
    if (userId) {
      updates.push('updated_by = ?');
      params.push(userId);
    }
    params.push(id);

    this.db.prepare(`UPDATE outreach_templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = this.getTemplateById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated template');
    }
    return updated;
  }

  deleteTemplate(id: string): boolean {
    const existing = this.getTemplateById(id);
    if (!existing) return false;
    this.db.prepare('DELETE FROM outreach_templates WHERE id = ?').run(id);
    return true;
  }
}

export const templateService = new TemplateService();
