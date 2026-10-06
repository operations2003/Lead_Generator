import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import {
  CampaignRecord,
  CampaignWithMetricsRecord,
  CampaignStatusType,
  LeadSourceType,
  LeadWithRelationsRecord,
} from '../db/types';

export const VALID_CAMPAIGN_STATUSES: CampaignStatusType[] = [
  'Draft',
  'Active',
  'Paused',
  'Completed',
  'Archived',
];

export const VALID_LEAD_SOURCES: LeadSourceType[] = [
  'LinkedIn',
  'Email',
  'Phone',
  'WhatsApp',
  'Website',
  'Free ATS Score Check',
  'LinkedIn Content',
  'Referral',
  'Partner',
  'Other',
];

export interface CreateCampaignInput {
  name: string;
  product: string;
  targetAudience?: string | null;
  industry?: string | null;
  location?: string | null;
  leadSource?: string | null;
  startDate: string;
  endDate?: string | null;
  status?: CampaignStatusType;
  assignedUserId?: string | null;
  notes?: string | null;
}

export interface UpdateCampaignInput {
  name?: string;
  product?: string;
  targetAudience?: string | null;
  industry?: string | null;
  location?: string | null;
  leadSource?: string | null;
  startDate?: string;
  endDate?: string | null;
  status?: CampaignStatusType;
  assignedUserId?: string | null;
  notes?: string | null;
}

export interface CampaignFilterOptions {
  search?: string;
  status?: CampaignStatusType;
  product?: string;
  leadSource?: string;
  industry?: string;
  location?: string;
  assignedUserId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class CampaignService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  createCampaign(input: CreateCampaignInput, userId?: string): CampaignWithMetricsRecord {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Campaign name is required');
    }
    if (!input.product || input.product.trim().length === 0) {
      throw new Error('Product is required');
    }
    if (!input.startDate) {
      throw new Error('Start date is required');
    }

    const id = `cmp-${crypto.randomUUID()}`;
    const status = input.status && VALID_CAMPAIGN_STATUSES.includes(input.status) ? input.status : 'Active';

    const stmt = this.db.prepare(`
      INSERT INTO campaigns (
        id, name, product, target_audience, industry, location,
        lead_source, start_date, end_date, status, assigned_user_id,
        notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    stmt.run(
      id,
      input.name.trim(),
      input.product.trim(),
      input.targetAudience?.trim() || null,
      input.industry?.trim() || null,
      input.location?.trim() || null,
      input.leadSource?.trim() || null,
      input.startDate,
      input.endDate || null,
      status,
      input.assignedUserId || null,
      input.notes?.trim() || null,
      userId || null
    );

    const created = this.getCampaignById(id);
    if (!created) {
      throw new Error('Failed to retrieve newly created campaign');
    }
    return created;
  }

  getCampaignById(id: string): CampaignWithMetricsRecord | null {
    const campaignRow = this.db.prepare(`
      SELECT 
        c.*,
        u.first_name || ' ' || u.last_name AS assigned_user_name,
        cb.first_name || ' ' || cb.last_name AS created_by_name
      FROM campaigns c
      LEFT JOIN users u ON c.assigned_user_id = u.id
      LEFT JOIN users cb ON c.created_by = cb.id
      WHERE c.id = ?
    `).get(id) as unknown as (CampaignRecord & { assigned_user_name: string | null; created_by_name: string | null }) | undefined;

    if (!campaignRow) {
      return null;
    }

    // Compute live metrics from connected leads
    const leadStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_leads,
        SUM(CASE WHEN status = 'Contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'Replied' THEN 1 ELSE 0 END) as replies,
        SUM(CASE WHEN status = 'Demo Booked' THEN 1 ELSE 0 END) as demos_booked,
        SUM(CASE WHEN status = 'Demo Done' THEN 1 ELSE 0 END) as demos_completed,
        SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) as lost
      FROM leads
      WHERE campaign_id = ?
    `).get(id) as unknown as {
      total_leads: number;
      new_leads: number;
      contacted: number;
      replies: number;
      demos_booked: number;
      demos_completed: number;
      won: number;
      lost: number;
    };

    // Calculate pending follow-ups due (due_date <= date('now') or today)
    const followUpsDueRow = this.db.prepare(`
      SELECT COUNT(*) as follow_ups_due
      FROM follow_ups f
      INNER JOIN leads l ON f.lead_id = l.id
      WHERE l.campaign_id = ?
        AND f.status = 'Pending'
        AND substr(f.due_date, 1, 10) <= date('now')
    `).get(id) as unknown as { follow_ups_due: number };

    const totalLeads = Number(leadStats.total_leads || 0);
    const wonCount = Number(leadStats.won || 0);
    const conversionRate = totalLeads > 0 ? Number(((wonCount / totalLeads) * 100).toFixed(1)) : 0;

    return {
      ...campaignRow,
      total_leads: totalLeads,
      new_leads: Number(leadStats.new_leads || 0),
      contacted: Number(leadStats.contacted || 0),
      replies: Number(leadStats.replies || 0),
      demos_booked: Number(leadStats.demos_booked || 0),
      demos_completed: Number(leadStats.demos_completed || 0),
      won: wonCount,
      lost: Number(leadStats.lost || 0),
      follow_ups_due: Number(followUpsDueRow.follow_ups_due || 0),
      conversion_rate: conversionRate,
    };
  }

  getCampaigns(options: CampaignFilterOptions = {}): {
    items: CampaignWithMetricsRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (options.search && options.search.trim()) {
      whereClauses.push('(c.name LIKE ? OR c.target_audience LIKE ? OR c.notes LIKE ?)');
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term);
    }

    if (options.status) {
      whereClauses.push('c.status = ?');
      params.push(options.status);
    }

    if (options.product) {
      whereClauses.push("(c.product = ? OR c.product = 'Both' OR ? = 'Both')");
      params.push(options.product, options.product);
    }

    if (options.leadSource) {
      whereClauses.push('c.lead_source = ?');
      params.push(options.leadSource);
    }

    if (options.industry) {
      whereClauses.push('c.industry LIKE ?');
      params.push(`%${options.industry.trim()}%`);
    }

    if (options.location) {
      whereClauses.push('c.location LIKE ?');
      params.push(`%${options.location.trim()}%`);
    }

    if (options.assignedUserId) {
      whereClauses.push('c.assigned_user_id = ?');
      params.push(options.assignedUserId);
    }

    if (options.startDate) {
      whereClauses.push('c.start_date >= ?');
      params.push(options.startDate);
    }

    if (options.endDate) {
      whereClauses.push('(c.end_date IS NULL OR c.end_date <= ?)');
      params.push(options.endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = this.db.prepare(`
      SELECT COUNT(*) as total FROM campaigns c ${whereSql}
    `).get(...params) as unknown as { total: number };

    const total = Number(countRow.total || 0);

    const rows = this.db.prepare(`
      SELECT 
        c.*,
        u.first_name || ' ' || u.last_name AS assigned_user_name,
        cb.first_name || ' ' || cb.last_name AS created_by_name,
        COALESCE(metrics.total_leads, 0) AS total_leads,
        COALESCE(metrics.new_leads, 0) AS new_leads,
        COALESCE(metrics.contacted, 0) AS contacted,
        COALESCE(metrics.replies, 0) AS replies,
        COALESCE(metrics.demos_booked, 0) AS demos_booked,
        COALESCE(metrics.demos_completed, 0) AS demos_completed,
        COALESCE(metrics.won, 0) AS won,
        COALESCE(metrics.lost, 0) AS lost,
        COALESCE(fu.follow_ups_due, 0) AS follow_ups_due
      FROM campaigns c
      LEFT JOIN users u ON c.assigned_user_id = u.id
      LEFT JOIN users cb ON c.created_by = cb.id
      LEFT JOIN (
        SELECT 
          campaign_id,
          COUNT(*) as total_leads,
          SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_leads,
          SUM(CASE WHEN status = 'Contacted' THEN 1 ELSE 0 END) as contacted,
          SUM(CASE WHEN status = 'Replied' THEN 1 ELSE 0 END) as replies,
          SUM(CASE WHEN status = 'Demo Booked' THEN 1 ELSE 0 END) as demos_booked,
          SUM(CASE WHEN status = 'Demo Done' THEN 1 ELSE 0 END) as demos_completed,
          SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) as lost
        FROM leads
        WHERE campaign_id IS NOT NULL
        GROUP BY campaign_id
      ) metrics ON c.id = metrics.campaign_id
      LEFT JOIN (
        SELECT 
          l.campaign_id,
          COUNT(*) as follow_ups_due
        FROM follow_ups f
        INNER JOIN leads l ON f.lead_id = l.id
        WHERE f.status = 'Pending'
          AND substr(f.due_date, 1, 10) <= date('now')
          AND l.campaign_id IS NOT NULL
        GROUP BY l.campaign_id
      ) fu ON c.id = fu.campaign_id
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as unknown as (CampaignWithMetricsRecord & {
      total_leads: number;
      won: number;
    })[];

    const items: CampaignWithMetricsRecord[] = rows.map((r) => {
      const totalLeads = Number(r.total_leads || 0);
      const won = Number(r.won || 0);
      const conversionRate = totalLeads > 0 ? Number(((won / totalLeads) * 100).toFixed(1)) : 0;
      return {
        ...r,
        total_leads: totalLeads,
        new_leads: Number(r.new_leads || 0),
        contacted: Number(r.contacted || 0),
        replies: Number(r.replies || 0),
        demos_booked: Number(r.demos_booked || 0),
        demos_completed: Number(r.demos_completed || 0),
        won,
        lost: Number(r.lost || 0),
        follow_ups_due: Number(r.follow_ups_due || 0),
        conversion_rate: conversionRate,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  updateCampaign(id: string, input: UpdateCampaignInput): CampaignWithMetricsRecord {
    const existing = this.getCampaignById(id);
    if (!existing) {
      throw new Error(`Campaign with id "${id}" not found`);
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      if (!input.name.trim()) throw new Error('Campaign name cannot be empty');
      updates.push('name = ?');
      params.push(input.name.trim());
    }
    if (input.product !== undefined) {
      if (!input.product.trim()) throw new Error('Product cannot be empty');
      updates.push('product = ?');
      params.push(input.product.trim());
    }
    if (input.targetAudience !== undefined) {
      updates.push('target_audience = ?');
      params.push(input.targetAudience?.trim() || null);
    }
    if (input.industry !== undefined) {
      updates.push('industry = ?');
      params.push(input.industry?.trim() || null);
    }
    if (input.location !== undefined) {
      updates.push('location = ?');
      params.push(input.location?.trim() || null);
    }
    if (input.leadSource !== undefined) {
      updates.push('lead_source = ?');
      params.push(input.leadSource?.trim() || null);
    }
    if (input.startDate !== undefined) {
      updates.push('start_date = ?');
      params.push(input.startDate);
    }
    if (input.endDate !== undefined) {
      updates.push('end_date = ?');
      params.push(input.endDate || null);
    }
    if (input.status !== undefined) {
      if (!VALID_CAMPAIGN_STATUSES.includes(input.status)) {
        throw new Error(`Invalid status: ${input.status}`);
      }
      updates.push('status = ?');
      params.push(input.status);
    }
    if (input.assignedUserId !== undefined) {
      updates.push('assigned_user_id = ?');
      params.push(input.assignedUserId || null);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      params.push(input.notes?.trim() || null);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    this.db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = this.getCampaignById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated campaign');
    }
    return updated;
  }

  archiveCampaign(id: string): CampaignWithMetricsRecord {
    return this.updateCampaign(id, { status: 'Archived' });
  }

  deleteCampaign(id: string): boolean {
    const existing = this.getCampaignById(id);
    if (!existing) {
      return false;
    }
    // Unlink leads before deleting
    this.db.prepare('UPDATE leads SET campaign_id = NULL WHERE campaign_id = ?').run(id);
    this.db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    return true;
  }

  getCampaignLeads(campaignId: string): LeadWithRelationsRecord[] {
    const rows = this.db.prepare(`
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
      WHERE l.campaign_id = ?
      ORDER BY l.created_at DESC
    `).all(campaignId) as unknown as LeadWithRelationsRecord[];

    return rows;
  }
}

export const campaignService = new CampaignService();
