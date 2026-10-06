import { Router, Response } from 'express';
import { outreachService, CreateFollowUpInput, UpdateFollowUpInput } from '../services/outreachService';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import {
  validateFollowUpInput,
  validateFollowUpRescheduleInput,
  validateFollowUpUpdateInput,
} from '../middleware/validate';

export const followUpRouter = Router();

// All follow-up routes require authentication
followUpRouter.use(authenticateToken);

// GET /api/v1/follow-ups/summary - Retrieve KPI counts (overdue, due today, upcoming, completed)
followUpRouter.get('/summary', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { leadId } = req.query;
    const summary = outreachService.getFollowUpSummary(leadId ? String(leadId) : undefined);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve follow-up summary',
      code: err.code || 'FOLLOW_UP_SUMMARY_ERROR',
    });
  }
});

// GET /api/v1/follow-ups - Retrieve follow-ups with filtering, search, and pagination
followUpRouter.get('/', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { leadId, userId, status, filter, type, search, page, limit } = req.query;

    const result = outreachService.getFollowUps({
      leadId: leadId ? String(leadId) : undefined,
      userId: userId ? String(userId) : undefined,
      status: status ? String(status) : undefined,
      filter: filter as 'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | undefined,
      type: type ? String(type) : undefined,
      search: search ? String(search) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve follow-ups',
      code: err.code || 'FOLLOW_UP_FETCH_ERROR',
    });
  }
});

// GET /api/v1/follow-ups/:id - Retrieve single follow-up
followUpRouter.get('/:id', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const followUp = outreachService.getFollowUpById(req.params.id);
    if (!followUp) {
      res.status(404).json({
        success: false,
        message: 'Follow-up not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: followUp,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve follow-up',
      code: err.code || 'FOLLOW_UP_FETCH_ERROR',
    });
  }
});

// POST /api/v1/follow-ups - Create a follow-up task
followUpRouter.post(
  '/',
  requirePermission('leads:write'),
  validateFollowUpInput,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const userId = req.user?.id || 'usr_sales_001';
      const input: CreateFollowUpInput = {
        leadId: req.body.leadId,
        activityId: req.body.activityId,
        title: req.body.title,
        type: req.body.type,
        dueDate: req.body.dueDate,
        notes: req.body.notes,
        cadenceDay: req.body.cadenceDay,
      };

      const created = outreachService.createFollowUp(userId, input);
      res.status(201).json({
        success: true,
        data: created,
        message: 'Follow-up created successfully',
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to create follow-up',
        code: err.code || 'FOLLOW_UP_CREATE_ERROR',
      });
    }
  }
);

// PATCH /api/v1/follow-ups/:id/complete - Mark follow-up completed
followUpRouter.patch(
  '/:id/complete',
  requirePermission('leads:write'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const userId = req.user?.id || 'usr_sales_001';
      const completionNotes = req.body.notes;

      const updated = outreachService.completeFollowUp(req.params.id, userId, completionNotes);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Follow-up marked as completed',
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to complete follow-up',
        code: err.code || 'FOLLOW_UP_COMPLETE_ERROR',
      });
    }
  }
);

// PATCH /api/v1/follow-ups/:id/reschedule - Reschedule follow-up
followUpRouter.patch(
  '/:id/reschedule',
  requirePermission('leads:write'),
  validateFollowUpRescheduleInput,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { dueDate, notes } = req.body;
      const updated = outreachService.rescheduleFollowUp(req.params.id, dueDate, notes);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Follow-up rescheduled successfully',
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to reschedule follow-up',
        code: err.code || 'FOLLOW_UP_RESCHEDULE_ERROR',
      });
    }
  }
);

// PATCH /api/v1/follow-ups/:id - Update follow-up general fields
followUpRouter.patch(
  '/:id',
  requirePermission('leads:write'),
  validateFollowUpUpdateInput,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const input: UpdateFollowUpInput = {
        title: req.body.title,
        type: req.body.type,
        dueDate: req.body.dueDate,
        status: req.body.status,
        notes: req.body.notes,
        cadenceDay: req.body.cadenceDay,
      };

      const updated = outreachService.updateFollowUp(req.params.id, input);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Follow-up updated successfully',
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; code?: string };
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to update follow-up',
        code: err.code || 'FOLLOW_UP_UPDATE_ERROR',
      });
    }
  }
);

// DELETE /api/v1/follow-ups/:id - Delete follow-up
followUpRouter.delete('/:id', requirePermission('leads:write'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const deleted = outreachService.deleteFollowUp(req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Follow-up not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Follow-up deleted successfully',
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to delete follow-up',
      code: err.code || 'FOLLOW_UP_DELETE_ERROR',
    });
  }
});
