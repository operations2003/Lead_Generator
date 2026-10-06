import { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/database';

export interface ReportingFilterOptions {
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'all';
}

export interface ReportingOverview {
  summary: {
    companiesAdded: number;
    contactsFound: number;
    leadsCreated: number;
    messagesSent: number;
    callsMade: number;
    totalOutreachTouches: number;
    replies: number;
    demosBooked: number;
    demosCompleted: number;
    won: number;
    lost: number;
    totalClosed: number;
    conversionRate: number;
    overdueFollowUps: number;
    totalPipelineValue: number;
  };
  leadsBySource: {
    source: string;
    count: number;
    percentage: number;
    wonCount: number;
  }[];
  leadsByCampaign: {
    campaignId: string;
    campaignName: string;
    product: string;
    totalLeads: number;
    contacted: number;
    replies: number;
    demosBooked: number;
    won: number;
    conversionRate: number;
  }[];
  leadsByProduct: {
    product: string;
    count: number;
    percentage: number;
    pipelineValue: number;
    wonCount: number;
  }[];
  recentActivityTrends: {
    date: string;
    activities: number;
    leads: number;
  }[];
  filters: {
    startDate: string;
    endDate: string;
    period: string;
  };
}

export class ReportingService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  private getDateRange(options: ReportingFilterOptions): { startDate: string; endDate: string; period: string } {
    const today = new Date();
    const period = options.period || 'all';

    let startDate = options.startDate;
    const endDate = options.endDate || today.toISOString().split('T')[0];

    if (!startDate) {
      if (period === 'daily') {
        startDate = endDate;
      } else if (period === 'weekly') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 1);
        startDate = d.toISOString().split('T')[0];
      } else if (period === 'quarterly') {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 3);
        startDate = d.toISOString().split('T')[0];
      } else {
        // all time: default to 1 year ago or beginning of platform data
        startDate = '2020-01-01';
      }
    }

    return { startDate, endDate, period };
  }

  getOverview(options: ReportingFilterOptions = {}): ReportingOverview {
    const { startDate, endDate, period } = this.getDateRange(options);

    // 1. Companies added
    const compRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM companies
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(startDate, endDate) as unknown as { count: number };
    const companiesAdded = Number(compRow?.count || 0);

    // 2. Contacts found
    const contRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM contacts
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(startDate, endDate) as unknown as { count: number };
    const contactsFound = Number(contRow?.count || 0);

    // 3. Leads created
    const leadsRow = this.db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(value), 0) as total_value,
        SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN status = 'Demo Booked' THEN 1 ELSE 0 END) as demos_booked,
        SUM(CASE WHEN status = 'Demo Done' THEN 1 ELSE 0 END) as demos_completed,
        SUM(CASE WHEN status = 'Replied' THEN 1 ELSE 0 END) as replies
      FROM leads
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(startDate, endDate) as unknown as {
      count: number;
      total_value: number;
      won: number;
      lost: number;
      demos_booked: number;
      demos_completed: number;
      replies: number;
    };

    const leadsCreated = Number(leadsRow?.count || 0);
    const totalPipelineValue = Number(leadsRow?.total_value || 0);
    const wonCount = Number(leadsRow?.won || 0);
    const lostCount = Number(leadsRow?.lost || 0);
    const totalClosed = wonCount + lostCount;
    const conversionRate = leadsCreated > 0 ? Number(((wonCount / leadsCreated) * 100).toFixed(1)) : 0;

    // 4. Outreach activities: messages vs calls
    const actRow = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type IN ('Email', 'LinkedIn', 'WhatsApp', 'Other') THEN 1 ELSE 0 END) as messages,
        SUM(CASE WHEN type = 'Phone' THEN 1 ELSE 0 END) as calls
      FROM activities
      WHERE substr(activity_date, 1, 10) BETWEEN ? AND ?
    `).get(startDate, endDate) as unknown as { total: number; messages: number; calls: number };

    const messagesSent = Number(actRow?.messages || 0);
    const callsMade = Number(actRow?.calls || 0);
    const totalOutreachTouches = Number(actRow?.total || 0);

    // 5. Stage transitions: Replies, Demos Booked, Demos Completed
    const stageTransRow = this.db.prepare(`
      SELECT 
        SUM(CASE WHEN to_stage = 'Replied' THEN 1 ELSE 0 END) as replies,
        SUM(CASE WHEN to_stage = 'Demo Booked' THEN 1 ELSE 0 END) as demos_booked,
        SUM(CASE WHEN to_stage = 'Demo Done' THEN 1 ELSE 0 END) as demos_completed
      FROM lead_stage_history
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(startDate, endDate) as unknown as { replies: number; demos_booked: number; demos_completed: number };

    const replies = Math.max(Number(leadsRow?.replies || 0), Number(stageTransRow?.replies || 0));
    const demosBooked = Math.max(Number(leadsRow?.demos_booked || 0), Number(stageTransRow?.demos_booked || 0));
    const demosCompleted = Math.max(Number(leadsRow?.demos_completed || 0), Number(stageTransRow?.demos_completed || 0));

    // 6. Overdue follow-ups: pending follow-ups with due date before current day
    const overdueRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM follow_ups
      WHERE status = 'Pending' AND substr(due_date, 1, 10) < date('now')
    `).get() as unknown as { count: number };
    const overdueFollowUps = Number(overdueRow?.count || 0);

    // 7. Leads by source
    const sourceRows = this.db.prepare(`
      SELECT 
        COALESCE(source, 'Other') as source,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) as won_count
      FROM leads
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
      GROUP BY source
      ORDER BY count DESC
    `).all(startDate, endDate) as unknown as { source: string; count: number; won_count: number }[];

    const leadsBySource = sourceRows.map((r) => {
      const count = Number(r.count || 0);
      const pct = leadsCreated > 0 ? Number(((count / leadsCreated) * 100).toFixed(1)) : 0;
      return {
        source: r.source,
        count,
        percentage: pct,
        wonCount: Number(r.won_count || 0),
      };
    });

    // 8. Leads by campaign
    const campaignRows = this.db.prepare(`
      SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        c.product,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.status != 'New' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN l.status IN ('Replied', 'Demo Booked', 'Demo Done', 'Won') THEN 1 ELSE 0 END) as replies,
        SUM(CASE WHEN l.status IN ('Demo Booked', 'Demo Done', 'Won') THEN 1 ELSE 0 END) as demos_booked,
        SUM(CASE WHEN l.status = 'Won' THEN 1 ELSE 0 END) as won
      FROM campaigns c
      LEFT JOIN leads l ON c.id = l.campaign_id AND substr(l.created_at, 1, 10) BETWEEN ? AND ?
      GROUP BY c.id
      ORDER BY total_leads DESC
    `).all(startDate, endDate) as unknown as {
      campaign_id: string;
      campaign_name: string;
      product: string;
      total_leads: number;
      contacted: number;
      replies: number;
      demos_booked: number;
      won: number;
    }[];

    const leadsByCampaign = campaignRows.map((r) => {
      const total = Number(r.total_leads || 0);
      const won = Number(r.won || 0);
      const conv = total > 0 ? Number(((won / total) * 100).toFixed(1)) : 0;
      return {
        campaignId: r.campaign_id,
        campaignName: r.campaign_name,
        product: r.product,
        totalLeads: total,
        contacted: Number(r.contacted || 0),
        replies: Number(r.replies || 0),
        demosBooked: Number(r.demos_booked || 0),
        won,
        conversionRate: conv,
      };
    });

    // 9. Leads by product
    const productRows = this.db.prepare(`
      SELECT 
        product,
        COUNT(*) as count,
        COALESCE(SUM(value), 0) as total_value,
        SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) as won_count
      FROM leads
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
      GROUP BY product
      ORDER BY count DESC
    `).all(startDate, endDate) as unknown as {
      product: string;
      count: number;
      total_value: number;
      won_count: number;
    }[];

    const leadsByProduct = productRows.map((r) => {
      const count = Number(r.count || 0);
      const pct = leadsCreated > 0 ? Number(((count / leadsCreated) * 100).toFixed(1)) : 0;
      return {
        product: r.product,
        count,
        percentage: pct,
        pipelineValue: Number(r.total_value || 0),
        wonCount: Number(r.won_count || 0),
      };
    });

    // 10. Recent activity trends (last 7 days within range)
    const trendRows = this.db.prepare(`
      SELECT 
        substr(activity_date, 1, 10) as date,
        COUNT(*) as activities
      FROM activities
      WHERE substr(activity_date, 1, 10) BETWEEN ? AND ?
      GROUP BY substr(activity_date, 1, 10)
      ORDER BY date ASC
      LIMIT 14
    `).all(startDate, endDate) as unknown as { date: string; activities: number }[];

    const recentActivityTrends = trendRows.map((t) => ({
      date: t.date,
      activities: Number(t.activities || 0),
      leads: 0,
    }));

    return {
      summary: {
        companiesAdded,
        contactsFound,
        leadsCreated,
        messagesSent,
        callsMade,
        totalOutreachTouches,
        replies,
        demosBooked,
        demosCompleted,
        won: wonCount,
        lost: lostCount,
        totalClosed,
        conversionRate,
        overdueFollowUps,
        totalPipelineValue,
      },
      leadsBySource,
      leadsByCampaign,
      leadsByProduct,
      recentActivityTrends,
      filters: {
        startDate,
        endDate,
        period,
      },
    };
  }
}

export const reportingService = new ReportingService();
