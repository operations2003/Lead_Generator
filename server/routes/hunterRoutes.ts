import { Router, Response } from 'express';
import { hunterService, HunterDiscoverCriteria, HunterProspectLead } from '../services/hunterService';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware/auth';

export const hunterRouter = Router();

// Protect all Hunter endpoints with JWT authentication
hunterRouter.use(authenticateToken);

/**
 * GET /api/v1/hunter/status
 * Returns Hunter.io API configuration status and available search/verification credits.
 */
hunterRouter.get('/status', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isConfigured = hunterService.isConfigured();

  if (!isConfigured) {
    res.status(200).json({
      success: true,
      data: {
        configured: false,
        message: 'HUNTER_API_KEY is not configured in backend environment variables. Please add HUNTER_API_KEY to your .env file.',
      },
    });
    return;
  }

  try {
    const accountInfo = await hunterService.getAccountInfo();
    res.status(200).json({
      success: true,
      data: {
        configured: true,
        account: accountInfo,
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(200).json({
      success: true,
      data: {
        configured: true,
        error: err.message || 'Unable to fetch Hunter.io account status',
        errorCode: err.code || 'HUNTER_STATUS_ERROR',
      },
    });
  }
});

/**
 * POST /api/v1/hunter/discover
 * Hunter API v2 POST /discover: finds companies matching industry, location, keywords.
 */
hunterRouter.post(
  '/discover',
  requirePermission('leads:read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const criteria: HunterDiscoverCriteria = req.body;
      const result = await hunterService.discoverCompanies(criteria);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to discover companies via Hunter.io',
        code: err.code || 'HUNTER_DISCOVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/hunter/domain-search
 * Hunter API v2 GET /domain-search: retrieves emails for a company domain.
 */
hunterRouter.get(
  '/domain-search',
  requirePermission('leads:read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { domain, limit, type } = req.query;

      if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Query parameter "domain" is required.',
          code: 'MISSING_DOMAIN',
        });
        return;
      }

      const parsedLimit = limit ? Number(limit) : 10;
      const parsedType = type === 'personal' || type === 'generic' ? type : undefined;

      const result = await hunterService.domainSearch(domain, {
        limit: parsedLimit,
        type: parsedType,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to perform domain search via Hunter.io',
        code: err.code || 'HUNTER_DOMAIN_SEARCH_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/hunter/find-email
 * Hunter API v2 GET /email-finder: finds a specific person's email given name and domain.
 */
hunterRouter.post(
  '/find-email',
  requirePermission('leads:read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { domain, firstName, lastName, company } = req.body;

      if (!domain || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Parameters "domain", "firstName", and "lastName" are required.',
          code: 'MISSING_PARAMETERS',
        });
        return;
      }

      const result = await hunterService.findEmail({
        domain: String(domain),
        firstName: String(firstName),
        lastName: String(lastName),
        company: company ? String(company) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to find email via Hunter.io',
        code: err.code || 'HUNTER_EMAIL_FINDER_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/hunter/verify-email
 * Hunter API v2 GET /email-verifier: verifies email deliverability on-demand.
 */
hunterRouter.post(
  '/verify-email',
  requirePermission('leads:write'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({
          success: false,
          message: 'Valid "email" parameter is required.',
          code: 'INVALID_EMAIL',
        });
        return;
      }

      const result = await hunterService.verifyEmail(email);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to verify email via Hunter.io',
        code: err.code || 'HUNTER_EMAIL_VERIFIER_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/hunter/prospect
 * Full Hunter B2B Prospecting Pipeline:
 * Discovers matching companies and concurrently enriches domain contacts.
 */
hunterRouter.post(
  '/prospect',
  requirePermission('leads:read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { industry, location, keywords, limit, enrichEmails, query } = req.body;

      if (!industry && !location && !query && (!keywords || keywords.length === 0)) {
        res.status(400).json({
          success: false,
          message: 'At least one search filter (industry, location, query, or keywords) is required.',
          code: 'MISSING_SEARCH_CRITERIA',
        });
        return;
      }

      const parsedLimit = limit ? Math.min(Math.max(Number(limit), 1), 50) : 10;
      const parsedKeywords = Array.isArray(keywords)
        ? keywords
        : typeof keywords === 'string' && keywords.trim().length > 0
        ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
        : undefined;

      const result = await hunterService.b2bProspect({
        industry: industry ? String(industry).trim() : undefined,
        location: location ? String(location).trim() : undefined,
        keywords: parsedKeywords,
        query: query ? String(query).trim() : undefined,
        limit: parsedLimit,
        enrichEmails: enrichEmails !== false,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to execute Hunter.io B2B prospecting',
        code: err.code || 'HUNTER_PROSPECT_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/hunter/save-crm
 * Saves selected Hunter prospect leads into Core CRM tables (companies, contacts, leads).
 */
hunterRouter.post(
  '/save-crm',
  requirePermission('leads:write'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { prospects } = req.body;

      if (!Array.isArray(prospects) || prospects.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Array of "prospects" is required.',
          code: 'MISSING_PROSPECTS',
        });
        return;
      }

      const userId = req.user?.id || 'usr_admin_001';
      const result = await hunterService.saveProspectsToCrm(prospects as HunterProspectLead[], userId);

      res.status(200).json({
        success: true,
        message: `Successfully saved ${result.savedCompanies} companies, ${result.savedContacts} contacts, and ${result.savedLeads} leads to CRM.`,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to save Hunter prospects to CRM',
        code: err.code || 'HUNTER_SAVE_CRM_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/hunter/export-csv
 * Exports Hunter prospect leads to CSV file content.
 */
hunterRouter.post(
  '/export-csv',
  requirePermission('leads:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { prospects } = req.body;

      if (!Array.isArray(prospects) || prospects.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Array of "prospects" is required.',
          code: 'MISSING_PROSPECTS',
        });
        return;
      }

      const csvData = hunterService.exportCsv(prospects as HunterProspectLead[]);
      const filename = `hunter_b2b_prospects_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvData);
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to export CSV',
        code: err.code || 'HUNTER_EXPORT_ERROR',
      });
    }
  }
);
