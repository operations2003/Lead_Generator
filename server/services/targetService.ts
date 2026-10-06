import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import { WeeklyTargetRecord, WeeklyTargetType, WeeklyTargetSummary } from '../db/types';

export const VALID_TARGET_TYPES: WeeklyTargetType[] = [
  'companies',
  'contacts',
  'outreach',
  'replies',
  'demos',
];

export interface SaveWeeklyTargetInput {
  targetType: WeeklyTargetType;
  targetValue: number;
  userId?: string | null;
  startDate?: string;
  endDate?: string;
}

export class TargetService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  getCurrentWeekDates(): { startDate: string; endDate: string } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0],
    };
  }

  getWeeklyTargets(startDate?: string, endDate?: string, userId?: string | null): WeeklyTargetSummary[] {
    const current = this.getCurrentWeekDates();
    const start = startDate || current.startDate;
    const end = endDate || current.endDate;

    // Get configured target records
    const targetRows = this.db.prepare(`
      SELECT * FROM weekly_targets
      WHERE start_date = ? AND end_date = ?
      ${userId ? 'AND (user_id = ? OR user_id IS NULL)' : 'AND user_id IS NULL'}
    `).all(start, end, ...(userId ? [userId] : [])) as unknown as WeeklyTargetRecord[];

    const targetMap = new Map<WeeklyTargetType, WeeklyTargetRecord>();
    for (const row of targetRows) {
      targetMap.set(row.target_type, row);
    }

    // Default target fallbacks if not yet created for this week
    const defaultTargetValues: Record<WeeklyTargetType, number> = {
      companies: 25,
      contacts: 50,
      outreach: 75,
      replies: 20,
      demos: 8,
    };

    // Calculate actuals from real database tables
    // 1. Companies created in date range
    const companiesActual = this.db.prepare(`
      SELECT COUNT(*) as count FROM companies
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(start, end) as unknown as { count: number };

    // 2. Contacts found in date range
    const contactsActual = this.db.prepare(`
      SELECT COUNT(*) as count FROM contacts
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(start, end) as unknown as { count: number };

    // 3. Outreach touches (messages & calls)
    const outreachActual = this.db.prepare(`
      SELECT COUNT(*) as count FROM activities
      WHERE substr(activity_date, 1, 10) BETWEEN ? AND ?
    `).get(start, end) as unknown as { count: number };

    // 4. Replies recorded
    const repliesActual = this.db.prepare(`
      SELECT COUNT(DISTINCT lead_id) as count FROM lead_stage_history
      WHERE to_stage = 'Replied' AND substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(start, end) as unknown as { count: number };

    // 5. Demos booked or completed
    const demosActual = this.db.prepare(`
      SELECT COUNT(DISTINCT lead_id) as count FROM lead_stage_history
      WHERE to_stage IN ('Demo Booked', 'Demo Done') AND substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(start, end) as unknown as { count: number };

    const actualMap: Record<WeeklyTargetType, number> = {
      companies: Number(companiesActual?.count || 0),
      contacts: Number(contactsActual?.count || 0),
      outreach: Number(outreachActual?.count || 0),
      replies: Number(repliesActual?.count || 0),
      demos: Number(demosActual?.count || 0),
    };

    return VALID_TARGET_TYPES.map((type) => {
      const existing = targetMap.get(type);
      const targetVal = existing ? existing.target_value : defaultTargetValues[type];
      const actualVal = actualMap[type];
      const rate = targetVal > 0 ? Number(((actualVal / targetVal) * 100).toFixed(1)) : 100;
      const remaining = Math.max(0, targetVal - actualVal);

      return {
        id: existing?.id,
        target_type: type,
        target_value: targetVal,
        actual_value: actualVal,
        achievement_rate: rate,
        remaining,
        user_id: userId || null,
        start_date: start,
        end_date: end,
      };
    });
  }

  saveWeeklyTarget(input: SaveWeeklyTargetInput, createdBy?: string): WeeklyTargetRecord {
    if (!VALID_TARGET_TYPES.includes(input.targetType)) {
      throw new Error(`Invalid target type: ${input.targetType}`);
    }
    if (input.targetValue < 0) {
      throw new Error('Target value cannot be negative');
    }

    const current = this.getCurrentWeekDates();
    const start = input.startDate || current.startDate;
    const end = input.endDate || current.endDate;

    // Check if target already exists for this week & user
    const existing = this.db.prepare(`
      SELECT * FROM weekly_targets
      WHERE target_type = ? AND start_date = ? AND end_date = ?
      ${input.userId ? 'AND user_id = ?' : 'AND user_id IS NULL'}
    `).get(input.targetType, start, end, ...(input.userId ? [input.userId] : [])) as unknown as WeeklyTargetRecord | undefined;

    if (existing) {
      this.db.prepare(`
        UPDATE weekly_targets
        SET target_value = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(input.targetValue, existing.id);

      return {
        ...existing,
        target_value: input.targetValue,
        updated_at: new Date().toISOString(),
      };
    } else {
      const id = `wt-${crypto.randomUUID()}`;
      this.db.prepare(`
        INSERT INTO weekly_targets (
          id, target_type, target_value, user_id, start_date, end_date, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(id, input.targetType, input.targetValue, input.userId || null, start, end, createdBy || null);

      return {
        id,
        target_type: input.targetType,
        target_value: input.targetValue,
        user_id: input.userId || null,
        start_date: start,
        end_date: end,
        created_by: createdBy || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }
}

export const targetService = new TargetService();
