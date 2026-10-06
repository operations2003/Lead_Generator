import { Router, Response } from 'express';
import { outreachService, CreateActivityInput, UpdateActivityInput } from '../services/outreachService';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { validateActivityInput, validateActivityUpdateInput } from '../middleware/validate';

export const activityRouter = Router();

// All activity routes require authentication
activityRouter.use(authenticateToken);

// GET /api/v1/activities - Retrieve activities, optionally filtered by leadId
activityRouter.get('/', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { leadId } = req.query;
    if (!leadId) {
      res.status(400).json({
        success: false,
        message: 'leadId query parameter is required to retrieve activity timeline',
        code: 'MISSING_LEAD_ID',
      });
      return;
    }

    const activities = outreachService.getActivitiesByLead(String(leadId));
    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve activity timeline',
      code: err.code || 'ACTIVITY_FETCH_ERROR',
    });
  }
});

// GET /api/v1/activities/lead/:leadId - Semantic lead timeline endpoint
activityRouter.get('/lead/:leadId', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { leadId } = req.params;
    const activities = outreachService.getActivitiesByLead(leadId);
    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve activity timeline',
      code: err.code || 'ACTIVITY_FETCH_ERROR',
    });
  }
});

// GET /api/v1/activities/:id - Retrieve single activity
activityRouter.get('/:id', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const activity = outreachService.getActivityById(req.params.id);
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve activity',
      code: err.code || 'ACTIVITY_FETCH_ERROR',
    });
  }
});

// POST /api/v1/activities - Log outreach activity
activityRouter.post(
  '/',
  requirePermission('leads:write'),
  validateActivityInput,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const userId = req.user?.id || 'usr_sales_001';
      const input: CreateActivityInput = {
        leadId: req.body.leadId,
        type: req.body.type,
        subject: req.body.subject,
        notes: req.body.notes,
        activityDate: req.body.activityDate,
        cadenceDay: req.body.cadenceDay,
        scheduleFollowUp: req.body.scheduleFollowUp,
      };

      const created = outreachService.createActivity(userId, input);
      res.status(201).json({
        success: true,
        data: created,
        message: 'Outreach activity logged successfully',
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to log outreach activity',
        code: err.code || 'ACTIVITY_CREATE_ERROR',
      });
    }
  }
);

// PATCH /api/v1/activities/:id - Update activity
activityRouter.patch(
  '/:id',
  requirePermission('leads:write'),
  validateActivityUpdateInput,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const input: UpdateActivityInput = {
        type: req.body.type,
        subject: req.body.subject,
        notes: req.body.notes,
        activityDate: req.body.activityDate,
        cadenceDay: req.body.cadenceDay,
      };

      const updated = outreachService.updateActivity(req.params.id, input);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Activity updated successfully',
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to update activity',
        code: err.code || 'ACTIVITY_UPDATE_ERROR',
      });
    }
  }
);

// DELETE /api/v1/activities/:id - Delete activity
activityRouter.delete('/:id', requirePermission('leads:write'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const deleted = outreachService.deleteActivity(req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to delete activity',
      code: err.code || 'ACTIVITY_DELETE_ERROR',
    });
  }
});
