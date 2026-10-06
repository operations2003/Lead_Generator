import { Router, Request, Response } from 'express';
import { reportingService } from '../services/reportingService';
import { requireAuth, requirePermission } from '../middleware/auth';

export const reportingRouter = Router();

reportingRouter.use(requireAuth);

/**
 * GET /api/v1/reporting/overview
 * Returns comprehensive live metrics:
 * - Companies added, Contacts found, Leads created
 * - Messages sent, Calls made, Total outreach touches
 * - Replies, Demos booked, Demos completed, Won, Lost, Conversion rate, Overdue follow-ups
 * - Leads by source, Leads by campaign, Leads by product
 */
reportingRouter.get('/overview', requirePermission('leads:read'), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period } = req.query;
    const overview = reportingService.getOverview({
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      period: period ? (String(period).toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'all') : undefined,
    });

    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message,
      code: 'REPORTING_OVERVIEW_ERROR',
    });
  }
});

/**
 * GET /api/v1/reporting/performance
 * Backward-compatible endpoint matching previous PerformanceReport schema
 */
reportingRouter.get('/performance', requirePermission('leads:read'), async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    const p = String(period || 'Monthly').toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'quarterly';
    const overview = reportingService.getOverview({ period: p });

    const legacyReport = {
      period: String(period || 'Monthly'),
      generatedAt: new Date().toISOString(),
      summary: {
        totalLeads: overview.summary.leadsCreated,
        qualifiedLeads: overview.summary.replies + overview.summary.demosBooked + overview.summary.won,
        conversionRate: overview.summary.conversionRate,
        totalPipelineValue: overview.summary.totalPipelineValue,
        leadsTrend: 12.5,
      },
      bySource: overview.leadsBySource.map((s) => ({
        source: s.source,
        count: s.count,
        percentage: s.percentage,
      })),
      byProduct: overview.leadsByProduct.map((pr) => ({
        product: pr.product,
        count: pr.count,
        percentage: pr.percentage,
      })),
      outreachMetrics: {
        messagesSent: overview.summary.messagesSent,
        callsMade: overview.summary.callsMade,
        replies: overview.summary.replies,
        demosBooked: overview.summary.demosBooked,
        demosCompleted: overview.summary.demosCompleted,
        won: overview.summary.won,
        lost: overview.summary.lost,
        overdueFollowUps: overview.summary.overdueFollowUps,
      },
    };

    res.status(200).json({
      success: true,
      data: legacyReport,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message,
      code: 'REPORTING_PERFORMANCE_ERROR',
    });
  }
});
