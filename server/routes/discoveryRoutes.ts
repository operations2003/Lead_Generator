import { Router, Response } from 'express';
import { DiscoveryService } from '../services/discoveryService';
import { DataQualityService } from '../services/dataQualityService';
import { autoDiscoveryService, DiscoveryProgressEvent } from '../services/autoDiscoveryService';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { LeadFilterOptions } from '../services/leadService';

export const discoveryRouter = Router();
const discoveryService = new DiscoveryService();
const dataQualityService = new DataQualityService();

// All discovery routes require authentication
discoveryRouter.use(authenticateToken);

const VALID_PRODUCTS = new Set(['Higher IQ', 'HRMS Portal', 'Both']);
const VALID_PRIORITIES = new Set(['High', 'Medium', 'Low']);
const VALID_STAGES = new Set([
  'New',
  'Contacted',
  'Replied',
  'Demo Booked',
  'Demo Done',
  'Won',
  'Lost',
  'Archived',
]);
const VALID_FOLLOW_UP_STATUSES = new Set([
  'pending',
  'overdue',
  'today',
  'upcoming',
  'completed',
  'none',
]);
const VALID_PRODUCT_FITS = new Set(['High', 'Medium', 'Low']);
const VALID_SORT_FIELDS = new Set([
  'title',
  'value',
  'priority',
  'score',
  'status',
  'company',
  'createdAt',
  'updatedAt',
  'stageChangedAt',
  'hiringVolume',
]);

/**
 * GET /api/v1/discovery/options
 * Returns all available filters, metadata, lead signals, and tools.
 */
discoveryRouter.get(
  '/options',
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      const options = discoveryService.getDiscoveryOptions();
      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to retrieve discovery options',
        code: err.code || 'DISCOVERY_OPTIONS_ERROR',
      });
    }
  }
);

/**
 * Dedicated Metadata Discovery Endpoints
 */
discoveryRouter.get(
  ['/lead-sources', '/sources'],
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      res.status(200).json({ success: true, data: discoveryService.getLeadSources() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
    }
  }
);

discoveryRouter.get(
  '/industries',
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      res.status(200).json({ success: true, data: discoveryService.getIndustries() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
    }
  }
);

discoveryRouter.get(
  '/products',
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      res.status(200).json({ success: true, data: discoveryService.getProducts() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
    }
  }
);

discoveryRouter.get(
  '/stages',
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      res.status(200).json({ success: true, data: discoveryService.getStages() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
    }
  }
);

discoveryRouter.get(
  '/priorities',
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      res.status(200).json({ success: true, data: discoveryService.getPriorities() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
    }
  }
);

discoveryRouter.get(
  ['/existing-tools', '/tools'],
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      res.status(200).json({ success: true, data: discoveryService.getExistingTools() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
    }
  }
);

discoveryRouter.get(
  ['/lead-signals', '/signals'],
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      res.status(200).json({ success: true, data: discoveryService.getLeadSignals() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
    }
  }
);

/**
 * GET /api/v1/discovery/leads
 * Advanced search and discovery endpoint supporting multifaceted company, contact, and lead filters.
 */
discoveryRouter.get(
  '/leads',
  requirePermission('leads:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const {
        page,
        limit,
        search,
        product,
        priority,
        status,
        stage,
        campaignId,
        source,
        companyId,
        contactId,
        minScore,
        includeArchived,
        sortBy,
        sortOrder,
        existingTools,
        existingTool,
        signals,
        hiringSignals,
        leadSignals,
        hiringVolume,
        followUpStatus,
        industry,
        location,
        employeeSize,
        productFit,
        jobTitle,
        title,
        decisionMaker,
        company,
        productRelevance,
      } = req.query;

      // Parameter validation
      if (page !== undefined) {
        const parsedPage = Number(page);
        if (isNaN(parsedPage) || parsedPage < 1) {
          res.status(400).json({
            success: false,
            message: 'Query parameter "page" must be a positive integer',
            code: 'INVALID_PAGE_PARAMETER',
          });
          return;
        }
      }

      if (limit !== undefined) {
        const parsedLimit = Number(limit);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
          res.status(400).json({
            success: false,
            message: 'Query parameter "limit" must be an integer between 1 and 100',
            code: 'INVALID_LIMIT_PARAMETER',
          });
          return;
        }
      }

      const activeProduct = product ? String(product) : undefined;
      if (activeProduct && !VALID_PRODUCTS.has(activeProduct)) {
        res.status(400).json({
          success: false,
          message: `Invalid product filter "${activeProduct}". Must be one of: Higher IQ, HRMS Portal, Both`,
          code: 'INVALID_PRODUCT_FILTER',
        });
        return;
      }

      const activePriority = priority ? String(priority) : undefined;
      if (activePriority && !VALID_PRIORITIES.has(activePriority)) {
        res.status(400).json({
          success: false,
          message: `Invalid priority filter "${activePriority}". Must be one of: High, Medium, Low`,
          code: 'INVALID_PRIORITY_FILTER',
        });
        return;
      }

      const activeStatus = (status || stage) ? String(status || stage) : undefined;
      if (activeStatus && !VALID_STAGES.has(activeStatus)) {
        res.status(400).json({
          success: false,
          message: `Invalid stage/status filter "${activeStatus}".`,
          code: 'INVALID_STAGE_FILTER',
        });
        return;
      }

      const activeFollowUp = followUpStatus ? String(followUpStatus).trim().toLowerCase() : undefined;
      if (activeFollowUp && !VALID_FOLLOW_UP_STATUSES.has(activeFollowUp)) {
        res.status(400).json({
          success: false,
          message: `Invalid follow-up status filter "${followUpStatus}". Must be one of: Pending, Overdue, Today, Upcoming, Completed, None`,
          code: 'INVALID_FOLLOWUP_FILTER',
        });
        return;
      }

      const activeProductFit = productFit ? String(productFit) : undefined;
      if (activeProductFit && !VALID_PRODUCT_FITS.has(activeProductFit)) {
        res.status(400).json({
          success: false,
          message: `Invalid product fit filter "${activeProductFit}". Must be one of: High, Medium, Low`,
          code: 'INVALID_PRODUCT_FIT_FILTER',
        });
        return;
      }

      const activeSortBy = sortBy ? String(sortBy) : undefined;
      if (activeSortBy && !VALID_SORT_FIELDS.has(activeSortBy)) {
        res.status(400).json({
          success: false,
          message: `Invalid sort field "${activeSortBy}".`,
          code: 'INVALID_SORT_FIELD',
        });
        return;
      }

      const filterOptions: LeadFilterOptions = {
        page: page ? parseInt(String(page), 10) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        search: search ? String(search) : undefined,
        product: activeProduct,
        priority: activePriority,
        status: activeStatus,
        campaignId: campaignId ? String(campaignId) : undefined,
        source: source ? String(source) : undefined,
        companyId: companyId ? String(companyId) : undefined,
        contactId: contactId ? String(contactId) : undefined,
        minScore: minScore ? parseInt(String(minScore), 10) : undefined,
        includeArchived: includeArchived === 'true' || includeArchived === '1',
        sortBy: activeSortBy,
        sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined,
        existingTools: existingTools ? String(existingTools) : (existingTool ? String(existingTool) : undefined),
        existingTool: existingTool ? String(existingTool) : undefined,
        signals: signals ? String(signals) : undefined,
        hiringSignals: hiringSignals ? String(hiringSignals) : undefined,
        leadSignals: leadSignals ? String(leadSignals) : undefined,
        hiringVolume: hiringVolume ? String(hiringVolume) : undefined,
        followUpStatus: activeFollowUp,
        industry: industry ? String(industry) : undefined,
        location: location ? String(location) : undefined,
        employeeSize: employeeSize ? String(employeeSize) : undefined,
        productFit: activeProductFit,
        jobTitle: jobTitle ? String(jobTitle) : (title ? String(title) : undefined),
        decisionMaker: decisionMaker !== undefined ? String(decisionMaker) : undefined,
        company: company ? String(company) : undefined,
        productRelevance: productRelevance ? String(productRelevance) : undefined,
      };

      const result = discoveryService.searchLeads(filterOptions);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to execute lead discovery search',
        code: err.code || 'DISCOVERY_SEARCH_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/discovery/quality-audit
 * Review database health, index verification, orphan detection, and query benchmarks.
 */
discoveryRouter.get(
  '/quality-audit',
  requirePermission('leads:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      const audit = dataQualityService.runFullQualityAudit();
      res.status(200).json({
        success: true,
        data: audit,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to execute data quality audit',
        code: err.code || 'DATA_QUALITY_AUDIT_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/discovery/auto-discover
 * Executes Stage A (Company Discovery) + Stage B (Website Contact Enrichment)
 */
discoveryRouter.post(
  '/auto-discover',
  requirePermission('leads:write'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { category, location, maxResults, autoSave } = req.body;

      if (!category || typeof category !== 'string' || !category.trim()) {
        res.status(400).json({
          success: false,
          message: 'Field "category" is required (business category, e.g. "Software Development", "Dentists")',
          code: 'MISSING_CATEGORY',
        });
        return;
      }

      if (!location || typeof location !== 'string' || !location.trim()) {
        res.status(400).json({
          success: false,
          message: 'Field "location" is required (target location, e.g. "Austin, TX", "London")',
          code: 'MISSING_LOCATION',
        });
        return;
      }

      const parsedMax = maxResults ? Math.min(Math.max(Number(maxResults), 1), 50) : 10;
      const userId = req.user?.id || 'usr_admin_001';

      const result = await autoDiscoveryService.runDiscovery(
        {
          category: category.trim(),
          location: location.trim(),
          maxResults: parsedMax,
        },
        userId
      );

      // Auto-save to CRM if requested
      if (autoSave && result.leads.length > 0) {
        const leadIds = result.leads.map((l) => l.id);
        await autoDiscoveryService.saveLeadsToCrm(result.job.id, leadIds, userId);
        result.leads = autoDiscoveryService.getLeadsByJobId(result.job.id);
      }

      res.status(200).json({
        success: true,
        message: `Discovered and processed ${result.leads.length} companies`,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to execute automatic lead discovery',
        code: err.code || 'AUTO_DISCOVERY_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/discovery/auto-discover/stream
 * Server-Sent Events (SSE) live progress stream for discovery & enrichment
 */
discoveryRouter.get(
  '/auto-discover/stream',
  requirePermission('leads:write'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { category, location, maxResults } = req.query;

    if (!category || !location) {
      res.status(400).json({
        success: false,
        message: 'Query parameters "category" and "location" are required',
        code: 'MISSING_PARAMETERS',
      });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', { message: 'SSE connection established for lead discovery' });

    const onProgress = (evt: DiscoveryProgressEvent) => {
      sendEvent('progress', evt);
    };

    autoDiscoveryService.on('progress', onProgress);

    req.on('close', () => {
      autoDiscoveryService.off('progress', onProgress);
    });

    try {
      const userId = req.user?.id || 'usr_admin_001';
      const parsedMax = maxResults ? Math.min(Math.max(Number(maxResults), 1), 50) : 10;

      const result = await autoDiscoveryService.runDiscovery(
        {
          category: String(category).trim(),
          location: String(location).trim(),
          maxResults: parsedMax,
        },
        userId
      );

      sendEvent('complete', {
        job: result.job,
        leads: result.leads,
        message: `Successfully completed discovery of ${result.leads.length} companies`,
      });
    } catch (err) {
      sendEvent('error', {
        message: (err as Error).message || 'Automatic discovery failed',
      });
    } finally {
      autoDiscoveryService.off('progress', onProgress);
      res.end();
    }
  }
);

/**
 * GET /api/v1/discovery/jobs
 * List recent discovery jobs
 */
discoveryRouter.get(
  '/jobs',
  requirePermission('leads:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : 10;
      const jobs = autoDiscoveryService.getRecentJobs(limit);
      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to list discovery jobs',
        code: err.code || 'DISCOVERY_JOBS_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/discovery/jobs/:id
 * Retrieve job details and discovered leads with search & status filters
 */
discoveryRouter.get(
  '/jobs/:id',
  requirePermission('leads:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
      const job = autoDiscoveryService.getJobById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          message: `Discovery job "${jobId}" not found`,
          code: 'JOB_NOT_FOUND',
        });
        return;
      }

      const { search, status, hasContact } = req.query;
      const leads = autoDiscoveryService.getLeadsByJobId(jobId, {
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        hasContact: hasContact === 'true' || hasContact === '1',
      });

      res.status(200).json({
        success: true,
        data: {
          job,
          leads,
          total: leads.length,
        },
      });
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to retrieve discovery job',
        code: err.code || 'DISCOVERY_JOB_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/discovery/jobs/:id/save-crm
 * Save selected discovered leads to core CRM database (companies, contacts, leads)
 */
discoveryRouter.post(
  '/jobs/:id/save-crm',
  requirePermission('leads:write'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
      const { leadIds } = req.body;

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Array of "leadIds" is required',
          code: 'MISSING_LEAD_IDS',
        });
        return;
      }

      const userId = req.user?.id || 'usr_admin_001';
      const result = await autoDiscoveryService.saveLeadsToCrm(jobId, leadIds, userId);

      res.status(200).json({
        success: true,
        message: `Successfully saved ${result.savedCount} leads to CRM`,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to save leads to CRM',
        code: err.code || 'SAVE_CRM_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/discovery/jobs/:id/export-csv
 * Export discovered leads to CSV
 */
discoveryRouter.get(
  '/jobs/:id/export-csv',
  requirePermission('leads:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
      const job = autoDiscoveryService.getJobById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          message: `Discovery job "${jobId}" not found`,
          code: 'JOB_NOT_FOUND',
        });
        return;
      }

      const csvContent = autoDiscoveryService.exportCsv(jobId);
      const filename = `leads_discovery_${job.category.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to export CSV',
        code: err.code || 'EXPORT_CSV_ERROR',
      });
    }
  }
);

