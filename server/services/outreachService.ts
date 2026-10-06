import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import {
  ActivityRecord,
  ActivityWithRelationsRecord,
  ActivityType,
  FollowUpRecord,
  FollowUpWithRelationsRecord,
  FollowUpStatusType,
  FollowUpComputedStatus,
} from '../db/types';

export const VALID_ACTIVITY_TYPES: ActivityType[] = [
  'Email',
  'LinkedIn',
  'Phone',
  'WhatsApp',
  'Demo',
  'Other',
];

export const CADENCE_STEPS = [
  {
    day: 1,
    type: 'Email' as ActivityType,
    title: 'Day 1: Initial Value Pitch Email',
    description: 'Send concise personalized email highlighting specific company pain points and solution fit.',
  },
  {
    day: 3,
    type: 'LinkedIn' as ActivityType,
    title: 'Day 3: LinkedIn Connection & Context Note',
    description: 'Connect with decision maker; reference previous email and relevant IT insights.',
  },
  {
    day: 6,
    type: 'Phone' as ActivityType,
    title: 'Day 6: Alignment Discovery Call',
    description: 'Brief 5-minute phone call to verify current hiring bottlenecks and tooling stack.',
  },
  {
    day: 10,
    type: 'Email' as ActivityType,
    title: 'Day 10: Value Case Study Email',
    description: 'Share case study demonstrating ROI and hiring velocity improvements.',
  },
  {
    day: 15,
    type: 'Email' as ActivityType,
    title: 'Day 15: Final Follow-up / Break-up Note',
    description: 'Polite final touchpoint inquiring whether to close file or revisit next quarter.',
  },
];

export interface CreateActivityInput {
  leadId: string;
  type: ActivityType;
  subject?: string | null;
  notes: string;
  activityDate?: string;
  cadenceDay?: number | null;
  // Optional next follow-up creation in single transaction
  scheduleFollowUp?: {
    title: string;
    type?: ActivityType;
    dueDate: string;
    notes?: string | null;
    cadenceDay?: number | null;
  } | null;
}

export interface UpdateActivityInput {
  type?: ActivityType;
  subject?: string | null;
  notes?: string;
  activityDate?: string;
  cadenceDay?: number | null;
}

export interface CreateFollowUpInput {
  leadId: string;
  activityId?: string | null;
  title: string;
  type: ActivityType;
  dueDate: string;
  notes?: string | null;
  cadenceDay?: number | null;
}

export interface UpdateFollowUpInput {
  title?: string;
  type?: ActivityType;
  dueDate?: string;
  status?: FollowUpStatusType;
  notes?: string | null;
  cadenceDay?: number | null;
}

export interface FollowUpFilterParams {
  leadId?: string;
  userId?: string;
  status?: string;
  filter?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FollowUpSummary {
  overdue: number;
  dueToday: number;
  upcoming: number;
  completed: number;
  total: number;
}

/**
 * Calculates whether a follow-up is overdue, due today, or upcoming
 * strictly based on current UTC date and due_date value.
 */
export function computeFollowUpStatus(
  dueDate: string,
  status: FollowUpStatusType,
  currentDateOverride?: Date
): FollowUpComputedStatus {
  if (status === 'Completed') return 'Completed';
  if (status === 'Cancelled') return 'Cancelled';

  const now = currentDateOverride || new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dueStr = dueDate.split('T')[0];

  if (dueStr < todayStr) return 'Overdue';
  if (dueStr === todayStr) return 'Due Today';
  return 'Upcoming';
}

export class OutreachService {
  private get db(): DatabaseSync {
    return getDb();
  }

  // ==========================================
  // ACTIVITIES METHODS
  // ==========================================

  createActivity(
    userId: string,
    input: CreateActivityInput
  ): ActivityWithRelationsRecord {
    // 1. Verify lead exists
    const lead = this.db
      .prepare('SELECT id, title, company_id FROM leads WHERE id = ?')
      .get(input.leadId) as { id: string; title: string; company_id: string } | undefined;

    if (!lead) {
      const err = new Error(`Lead with id "${input.leadId}" not found`);
      (err as { status?: number }).status = 404;
      throw err;
    }

    if (!VALID_ACTIVITY_TYPES.includes(input.type)) {
      const err = new Error(`Invalid activity type "${input.type}". Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
      (err as { status?: number }).status = 400;
      throw err;
    }

    if (!input.notes || input.notes.trim().length === 0) {
      const err = new Error('Activity notes are required');
      (err as { status?: number }).status = 400;
      throw err;
    }

    const activityId = `act_${crypto.randomUUID().slice(0, 12)}`;
    const activityDate = input.activityDate || new Date().toISOString();

    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db
        .prepare(`
          INSERT INTO activities (
            id, lead_id, user_id, type, subject, notes, activity_date, cadence_day, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `)
        .run(
          activityId,
          input.leadId,
          userId,
          input.type,
          input.subject?.trim() || null,
          input.notes.trim(),
          activityDate,
          input.cadenceDay !== undefined ? input.cadenceDay : null
        );

      // Optional next scheduled follow-up
      if (input.scheduleFollowUp) {
        const followUpId = `flw_${crypto.randomUUID().slice(0, 12)}`;
        this.db
          .prepare(`
            INSERT INTO follow_ups (
              id, lead_id, activity_id, user_id, title, type, due_date, status, notes,
              cadence_day, rescheduled_count, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 0, datetime('now'), datetime('now'))
          `)
          .run(
            followUpId,
            input.leadId,
            activityId,
            userId,
            input.scheduleFollowUp.title.trim(),
            input.scheduleFollowUp.type || input.type,
            input.scheduleFollowUp.dueDate,
            input.scheduleFollowUp.notes?.trim() || null,
            input.scheduleFollowUp.cadenceDay !== undefined ? input.scheduleFollowUp.cadenceDay : null
          );
      }

      this.db.exec('COMMIT;');
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }

    const created = this.getActivityById(activityId);
    if (!created) {
      throw new Error('Failed to retrieve newly created activity');
    }
    return created;
  }

  getActivityById(id: string): ActivityWithRelationsRecord | null {
    const row = this.db
      .prepare(`
        SELECT
          a.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          l.title as lead_title,
          c.name as company_name,
          cnt.name as contact_name
        FROM activities a
        JOIN users u ON a.user_id = u.id
        JOIN leads l ON a.lead_id = l.id
        JOIN companies c ON l.company_id = c.id
        LEFT JOIN contacts cnt ON l.contact_id = cnt.id
        WHERE a.id = ?
      `)
      .get(id) as unknown as ActivityWithRelationsRecord | undefined;

    return row || null;
  }

  getActivitiesByLead(leadId: string): ActivityWithRelationsRecord[] {
    const rows = this.db
      .prepare(`
        SELECT
          a.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          l.title as lead_title,
          c.name as company_name,
          cnt.name as contact_name
        FROM activities a
        JOIN users u ON a.user_id = u.id
        JOIN leads l ON a.lead_id = l.id
        JOIN companies c ON l.company_id = c.id
        LEFT JOIN contacts cnt ON l.contact_id = cnt.id
        WHERE a.lead_id = ?
        ORDER BY a.activity_date DESC, a.created_at DESC
      `)
      .all(leadId) as unknown as ActivityWithRelationsRecord[];

    return rows;
  }

  updateActivity(id: string, input: UpdateActivityInput): ActivityWithRelationsRecord {
    const existing = this.getActivityById(id);
    if (!existing) {
      const err = new Error(`Activity with id "${id}" not found`);
      (err as { status?: number }).status = 404;
      throw err;
    }

    if (input.type && !VALID_ACTIVITY_TYPES.includes(input.type)) {
      const err = new Error(`Invalid activity type "${input.type}". Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
      (err as { status?: number }).status = 400;
      throw err;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.type !== undefined) {
      updates.push('type = ?');
      params.push(input.type);
    }
    if (input.subject !== undefined) {
      updates.push('subject = ?');
      params.push(input.subject?.trim() || null);
    }
    if (input.notes !== undefined) {
      if (input.notes.trim().length === 0) {
        const err = new Error('Activity notes cannot be empty');
        (err as { status?: number }).status = 400;
        throw err;
      }
      updates.push('notes = ?');
      params.push(input.notes.trim());
    }
    if (input.activityDate !== undefined) {
      updates.push('activity_date = ?');
      params.push(input.activityDate);
    }
    if (input.cadenceDay !== undefined) {
      updates.push('cadence_day = ?');
      params.push(input.cadenceDay);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    this.db
      .prepare(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`)
      .run(...params);

    return this.getActivityById(id)!;
  }

  deleteActivity(id: string): boolean {
    const result = this.db.prepare('DELETE FROM activities WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ==========================================
  // FOLLOW-UPS METHODS
  // ==========================================

  createFollowUp(
    userId: string,
    input: CreateFollowUpInput
  ): FollowUpWithRelationsRecord {
    // 1. Verify lead exists
    const lead = this.db
      .prepare('SELECT id FROM leads WHERE id = ?')
      .get(input.leadId) as { id: string } | undefined;

    if (!lead) {
      const err = new Error(`Lead with id "${input.leadId}" not found`);
      (err as { status?: number }).status = 404;
      throw err;
    }

    if (!input.title || input.title.trim().length === 0) {
      const err = new Error('Follow-up title is required');
      (err as { status?: number }).status = 400;
      throw err;
    }

    if (!VALID_ACTIVITY_TYPES.includes(input.type)) {
      const err = new Error(`Invalid follow-up type "${input.type}". Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
      (err as { status?: number }).status = 400;
      throw err;
    }

    if (!input.dueDate || isNaN(new Date(input.dueDate).getTime())) {
      const err = new Error('A valid due date is required');
      (err as { status?: number }).status = 400;
      throw err;
    }

    const followUpId = `flw_${crypto.randomUUID().slice(0, 12)}`;

    this.db
      .prepare(`
        INSERT INTO follow_ups (
          id, lead_id, activity_id, user_id, title, type, due_date, status, notes,
          cadence_day, rescheduled_count, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 0, datetime('now'), datetime('now'))
      `)
      .run(
        followUpId,
        input.leadId,
        input.activityId || null,
        userId,
        input.title.trim(),
        input.type,
        input.dueDate,
        input.notes?.trim() || null,
        input.cadenceDay !== undefined ? input.cadenceDay : null
      );

    const created = this.getFollowUpById(followUpId);
    if (!created) {
      throw new Error('Failed to retrieve newly created follow-up');
    }
    return created;
  }

  getFollowUpById(id: string): FollowUpWithRelationsRecord | null {
    const row = this.db
      .prepare(`
        SELECT
          f.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          cu.first_name || ' ' || cu.last_name as completed_by_name,
          l.title as lead_title,
          l.status as lead_status,
          l.priority as lead_priority,
          c.name as company_name,
          c.id as company_id,
          cnt.name as contact_name,
          cnt.id as contact_id,
          cnt.title as contact_title,
          cnt.email as contact_email,
          cnt.phone as contact_phone
        FROM follow_ups f
        JOIN users u ON f.user_id = u.id
        LEFT JOIN users cu ON f.completed_by = cu.id
        JOIN leads l ON f.lead_id = l.id
        JOIN companies c ON l.company_id = c.id
        LEFT JOIN contacts cnt ON l.contact_id = cnt.id
        WHERE f.id = ?
      `)
      .get(id) as unknown as FollowUpWithRelationsRecord | undefined;

    if (!row) return null;

    row.computed_status = computeFollowUpStatus(row.due_date, row.status);
    return row;
  }

  getFollowUps(params: FollowUpFilterParams = {}): {
    items: FollowUpWithRelationsRecord[];
    total: number;
    page: number;
    limit: number;
    summary: FollowUpSummary;
  } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const todayStr = new Date().toISOString().split('T')[0];

    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];

    if (params.leadId) {
      whereClauses.push('f.lead_id = ?');
      queryParams.push(params.leadId);
    }

    if (params.userId) {
      whereClauses.push('f.user_id = ?');
      queryParams.push(params.userId);
    }

    if (params.type && params.type !== 'all') {
      whereClauses.push('f.type = ?');
      queryParams.push(params.type);
    }

    if (params.status && params.status !== 'all') {
      whereClauses.push('f.status = ?');
      queryParams.push(params.status);
    }

    // Backend-calculated date filters
    if (params.filter === 'overdue') {
      whereClauses.push("f.status = 'Pending' AND substr(f.due_date, 1, 10) < ?");
      queryParams.push(todayStr);
    } else if (params.filter === 'today' || params.filter === 'due_today' as unknown) {
      whereClauses.push("f.status = 'Pending' AND substr(f.due_date, 1, 10) = ?");
      queryParams.push(todayStr);
    } else if (params.filter === 'upcoming') {
      whereClauses.push("f.status = 'Pending' AND substr(f.due_date, 1, 10) > ?");
      queryParams.push(todayStr);
    } else if (params.filter === 'completed') {
      whereClauses.push("f.status = 'Completed'");
    }

    if (params.search && params.search.trim().length > 0) {
      const term = `%${params.search.trim()}%`;
      whereClauses.push(`(
        f.title LIKE ? OR
        f.notes LIKE ? OR
        l.title LIKE ? OR
        c.name LIKE ? OR
        cnt.name LIKE ?
      )`);
      queryParams.push(term, term, term, term, term);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total matching
    const totalRow = this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM follow_ups f
        JOIN leads l ON f.lead_id = l.id
        JOIN companies c ON l.company_id = c.id
        LEFT JOIN contacts cnt ON l.contact_id = cnt.id
        ${whereSQL}
      `)
      .get(...queryParams) as { count: number };

    // Query items ordered intelligently: Overdue first, then today, then upcoming, completed last
    const rows = this.db
      .prepare(`
        SELECT
          f.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          cu.first_name || ' ' || cu.last_name as completed_by_name,
          l.title as lead_title,
          l.status as lead_status,
          l.priority as lead_priority,
          c.name as company_name,
          c.id as company_id,
          cnt.name as contact_name,
          cnt.id as contact_id,
          cnt.title as contact_title,
          cnt.email as contact_email,
          cnt.phone as contact_phone
        FROM follow_ups f
        JOIN users u ON f.user_id = u.id
        LEFT JOIN users cu ON f.completed_by = cu.id
        JOIN leads l ON f.lead_id = l.id
        JOIN companies c ON l.company_id = c.id
        LEFT JOIN contacts cnt ON l.contact_id = cnt.id
        ${whereSQL}
        ORDER BY
          CASE
            WHEN f.status = 'Pending' AND substr(f.due_date, 1, 10) < '${todayStr}' THEN 1
            WHEN f.status = 'Pending' AND substr(f.due_date, 1, 10) = '${todayStr}' THEN 2
            WHEN f.status = 'Pending' AND substr(f.due_date, 1, 10) > '${todayStr}' THEN 3
            ELSE 4
          END ASC,
          f.due_date ASC,
          f.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...queryParams, limit, offset) as unknown as FollowUpWithRelationsRecord[];

    const items = rows.map((r) => ({
      ...r,
      computed_status: computeFollowUpStatus(r.due_date, r.status),
    }));

    const summary = this.getFollowUpSummary(params.leadId);

    return {
      items,
      total: totalRow.count,
      page,
      limit,
      summary,
    };
  }

  getFollowUpSummary(leadId?: string): FollowUpSummary {
    const todayStr = new Date().toISOString().split('T')[0];
    const whereLead = leadId ? 'WHERE lead_id = ?' : '';
    const leadParam = leadId ? [leadId] : [];

    const stats = this.db
      .prepare(`
        SELECT
          SUM(CASE WHEN status = 'Pending' AND substr(due_date, 1, 10) < '${todayStr}' THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN status = 'Pending' AND substr(due_date, 1, 10) = '${todayStr}' THEN 1 ELSE 0 END) as due_today,
          SUM(CASE WHEN status = 'Pending' AND substr(due_date, 1, 10) > '${todayStr}' THEN 1 ELSE 0 END) as upcoming,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
          COUNT(*) as total
        FROM follow_ups
        ${whereLead}
      `)
      .get(...leadParam) as {
        overdue: number | null;
        due_today: number | null;
        upcoming: number | null;
        completed: number | null;
        total: number | null;
      };

    return {
      overdue: stats.overdue || 0,
      dueToday: stats.due_today || 0,
      upcoming: stats.upcoming || 0,
      completed: stats.completed || 0,
      total: stats.total || 0,
    };
  }

  completeFollowUp(
    id: string,
    userId: string,
    completionNotes?: string
  ): FollowUpWithRelationsRecord {
    const existing = this.getFollowUpById(id);
    if (!existing) {
      const err = new Error(`Follow-up with id "${id}" not found`);
      (err as { status?: number }).status = 404;
      throw err;
    }

    let finalNotes = existing.notes;
    if (completionNotes && completionNotes.trim().length > 0) {
      finalNotes = existing.notes
        ? `${existing.notes}\n[Completed Note]: ${completionNotes.trim()}`
        : completionNotes.trim();
    }

    this.db
      .prepare(`
        UPDATE follow_ups
        SET
          status = 'Completed',
          completed_at = datetime('now'),
          completed_by = ?,
          notes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(userId, finalNotes, id);

    return this.getFollowUpById(id)!;
  }

  rescheduleFollowUp(
    id: string,
    newDueDate: string,
    rescheduleNotes?: string
  ): FollowUpWithRelationsRecord {
    const existing = this.getFollowUpById(id);
    if (!existing) {
      const err = new Error(`Follow-up with id "${id}" not found`);
      (err as { status?: number }).status = 404;
      throw err;
    }

    if (!newDueDate || isNaN(new Date(newDueDate).getTime())) {
      const err = new Error('A valid new due date is required for rescheduling');
      (err as { status?: number }).status = 400;
      throw err;
    }

    let finalNotes = existing.notes;
    if (rescheduleNotes && rescheduleNotes.trim().length > 0) {
      finalNotes = existing.notes
        ? `${existing.notes}\n[Rescheduled to ${newDueDate.split('T')[0]}]: ${rescheduleNotes.trim()}`
        : rescheduleNotes.trim();
    }

    this.db
      .prepare(`
        UPDATE follow_ups
        SET
          due_date = ?,
          status = 'Pending',
          rescheduled_count = rescheduled_count + 1,
          completed_at = NULL,
          completed_by = NULL,
          notes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(newDueDate, finalNotes, id);

    return this.getFollowUpById(id)!;
  }

  updateFollowUp(id: string, input: UpdateFollowUpInput): FollowUpWithRelationsRecord {
    const existing = this.getFollowUpById(id);
    if (!existing) {
      const err = new Error(`Follow-up with id "${id}" not found`);
      (err as { status?: number }).status = 404;
      throw err;
    }

    if (input.type && !VALID_ACTIVITY_TYPES.includes(input.type)) {
      const err = new Error(`Invalid follow-up type "${input.type}". Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
      (err as { status?: number }).status = 400;
      throw err;
    }

    if (input.dueDate && isNaN(new Date(input.dueDate).getTime())) {
      const err = new Error('A valid due date is required');
      (err as { status?: number }).status = 400;
      throw err;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.title !== undefined) {
      if (input.title.trim().length === 0) {
        const err = new Error('Title cannot be empty');
        (err as { status?: number }).status = 400;
        throw err;
      }
      updates.push('title = ?');
      params.push(input.title.trim());
    }

    if (input.type !== undefined) {
      updates.push('type = ?');
      params.push(input.type);
    }

    if (input.dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(input.dueDate);
    }

    if (input.status !== undefined) {
      const validStatuses = ['Pending', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(input.status)) {
        const err = new Error(`Invalid status "${input.status}"`);
        (err as { status?: number }).status = 400;
        throw err;
      }
      updates.push('status = ?');
      params.push(input.status);
    }

    if (input.notes !== undefined) {
      updates.push('notes = ?');
      params.push(input.notes?.trim() || null);
    }

    if (input.cadenceDay !== undefined) {
      updates.push('cadence_day = ?');
      params.push(input.cadenceDay);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    this.db
      .prepare(`UPDATE follow_ups SET ${updates.join(', ')} WHERE id = ?`)
      .run(...params);

    return this.getFollowUpById(id)!;
  }

  deleteFollowUp(id: string): boolean {
    const result = this.db.prepare('DELETE FROM follow_ups WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

export const outreachService = new OutreachService();
