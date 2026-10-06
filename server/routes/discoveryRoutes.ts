import { Router, Response } from 'express';
import { DiscoveryService } from '../services/discoveryService';
import { DataQualityService } from '../services/dataQualityService';
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
