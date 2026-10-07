import { Router, Response } from 'express';
import { aiLeadGenService } from '../services/aiLeadGenService';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware/auth';

export const aiLeadGenRouter = Router();

// Check AI status
aiLeadGenRouter.get('/status', (_req, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'active',
      isConfigured: aiLeadGenService.isConfigured(),
      model: 'gpt-4o-mini',
      supportedFeatures: [
        'ai_lead_generation',
        'ai_qualification_scoring',
        'ai_personalized_outreach',
        'ai_company_mapping',
      ],
    },
  });
});

// All generative operations require authentication and leads:write
aiLeadGenRouter.use(authenticateToken);

// POST /api/v1/ai/generate-leads - Generate prospective leads with AI
aiLeadGenRouter.post(
  '/generate-leads',
  requirePermission('leads:write'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || 'usr_admin_001';
      const criteria = req.body;

      const leads = await aiLeadGenService.generateLeads(criteria, userId);

      res.status(200).json({
        success: true,
        message: `Successfully generated ${leads.length} AI leads`,
        data: leads,
      });
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to generate leads with AI',
        code: err.code || 'AI_LEAD_GEN_ERROR',
      });
    }
  }
);

// POST /api/v1/ai/qualify-lead - Deep AI qualification assessment
aiLeadGenRouter.post(
  '/qualify-lead',
  requirePermission('leads:read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { leadId } = req.body;
      if (!leadId) {
        res.status(400).json({
          success: false,
          message: 'leadId is required',
          code: 'MISSING_LEAD_ID',
        });
        return;
      }

      const result = await aiLeadGenService.qualifyLead(leadId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to qualify lead with AI',
        code: err.code || 'AI_QUALIFY_ERROR',
      });
    }
  }
);

// POST /api/v1/ai/outreach - Generate personalized cold outreach
aiLeadGenRouter.post(
  '/outreach',
  requirePermission('leads:read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await aiLeadGenService.generateOutreachMessage(req.body);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to generate outreach message with AI',
        code: err.code || 'AI_OUTREACH_ERROR',
      });
    }
  }
);

