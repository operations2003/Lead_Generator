import { Router, Request, Response } from 'express';
import { leadCaptureService } from '../services/leadCaptureService';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateAtsScoreLeadInput } from '../middleware/validate';

export const leadCaptureRouter = Router();

leadCaptureRouter.use(requireAuth);

/**
 * POST /api/v1/lead-capture/ats-score
 * Capture Free ATS Score Check lead with duplicate contact prevention
 */
leadCaptureRouter.post(
  '/ats-score',
  requirePermission('leads:write'),
  validateAtsScoreLeadInput,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const result = leadCaptureService.captureAtsScoreLead(
        {
          fullName: req.body.fullName,
          email: req.body.email,
          phone: req.body.phone,
          companyName: req.body.companyName,
          jobTitle: req.body.jobTitle,
          atsScore: req.body.atsScore,
          resumeName: req.body.resumeName,
          notes: req.body.notes,
          campaignId: req.body.campaignId,
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: result,
        message: result.isExistingContact
          ? 'Lead created and linked to existing contact (duplicate prevented)'
          : 'Lead and new contact created successfully',
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
        code: 'LEAD_CAPTURE_ERROR',
      });
    }
  }
);
