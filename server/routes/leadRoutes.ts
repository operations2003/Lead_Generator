import { Router, Response } from 'express';
import { LeadService } from '../services/leadService';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { validateLeadInput, validateLeadUpdateInput, validateStageChangeInput } from '../middleware/validate';
import { ProductType } from '../db/types';

export const leadRouter = Router();
const leadService = new LeadService();

// All lead routes require authentication
leadRouter.use(authenticateToken);

// GET /api/v1/leads/pipeline - Get leads grouped by stages for Kanban view
leadRouter.get('/pipeline', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { search, product, priority, companyId, contactId, minScore, includeArchived } = req.query;
    const result = leadService.getPipelineGrouped({
      search: search ? String(search) : undefined,
      product: product ? String(product) : undefined,
      priority: priority ? String(priority) : undefined,
      companyId: companyId ? String(companyId) : undefined,
      contactId: contactId ? String(contactId) : undefined,
      minScore: minScore ? parseInt(String(minScore), 10) : undefined,
      includeArchived: includeArchived === 'true' || includeArchived === '1',
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve pipeline stages',
      code: err.code || 'PIPELINE_ERROR',
    });
  }
});

// GET /api/v1/leads/check-duplicate - Check for duplicate active lead
leadRouter.get('/check-duplicate', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { companyId, product, excludeId } = req.query;
    if (!companyId || !product) {
      res.status(200).json({
        success: true,
        data: { isDuplicate: false },
      });
      return;
    }

    const result = leadService.checkDuplicate(
      String(companyId),
      String(product) as ProductType,
      excludeId ? String(excludeId) : undefined
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Duplicate check failed',
      code: err.code || 'DUPLICATE_CHECK_ERROR',
    });
  }
});

// POST /api/v1/leads/preview-qualification - Live qualification engine calculation (Backend source of truth)
leadRouter.post('/preview-qualification', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { signals, companyId, contactId } = req.body;
    if (!signals || !signals.product) {
      res.status(400).json({
        success: false,
        message: 'Signals object with product is required for preview',
        code: 'MISSING_SIGNALS',
      });
      return;
    }

    const result = leadService.previewQualification(signals, companyId, contactId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Qualification preview calculation failed',
      code: err.code || 'QUALIFICATION_PREVIEW_ERROR',
    });
  }
});

// GET /api/v1/leads - List / search / filter / paginate leads
leadRouter.get('/', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      page,
      limit,
      search,
      product,
      priority,
      status,
      companyId,
      contactId,
      minScore,
      includeArchived,
      sortBy,
      sortOrder,
      campaignId,
      source,
    } = req.query;

    const result = leadService.list({
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      search: search ? String(search) : undefined,
      product: product ? String(product) : undefined,
      priority: priority ? String(priority) : undefined,
      status: status ? String(status) : undefined,
      campaignId: campaignId ? String(campaignId) : undefined,
      source: source ? String(source) : undefined,
      companyId: companyId ? String(companyId) : undefined,
      contactId: contactId ? String(contactId) : undefined,
      minScore: minScore ? parseInt(String(minScore), 10) : undefined,
      includeArchived: includeArchived === 'true' || includeArchived === '1',
      sortBy: sortBy ? String(sortBy) : undefined,
      sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve leads',
      code: err.code || 'LEAD_LIST_ERROR',
    });
  }
});

// GET /api/v1/leads/:id - Get lead details with relations and qualification breakdown
leadRouter.get('/:id', requirePermission('leads:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const lead = leadService.getById(req.params.id);
    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead not found',
        code: 'LEAD_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve lead details',
      code: err.code || 'LEAD_DETAIL_ERROR',
    });
  }
});

// POST /api/v1/leads - Create lead with qualification engine enforcement
leadRouter.post('/', requirePermission('leads:write'), validateLeadInput, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const lead = leadService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Lead created and qualified successfully',
      data: lead,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string; duplicateLead?: unknown };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to create lead',
      code: err.code || 'LEAD_CREATE_ERROR',
      duplicateLead: err.duplicateLead,
    });
  }
});

// PATCH /api/v1/leads/:id - Update lead
leadRouter.patch('/:id', requirePermission('leads:write'), validateLeadUpdateInput, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const lead = leadService.update(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: lead,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to update lead',
      code: err.code || 'LEAD_UPDATE_ERROR',
    });
  }
});

// PATCH /api/v1/leads/:id/stage - Dedicated Stage Change Transition with rules & history
leadRouter.patch('/:id/stage', requirePermission('leads:write'), validateStageChangeInput, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { stage, notes, lostReason } = req.body;
    const changedBy = req.user?.id || null;
    const lead = leadService.changeStage(req.params.id, {
      stage,
      notes,
      lostReason,
      changedBy,
    });

    res.status(200).json({
      success: true,
      message: `Lead stage transitioned to ${stage}`,
      data: lead,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Stage transition failed',
      code: err.code || 'STAGE_TRANSITION_ERROR',
    });
  }
});

// DELETE /api/v1/leads/:id - Archive or delete lead
leadRouter.delete('/:id', requirePermission('leads:write'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const permanent = req.query.permanent === 'true' || req.query.permanent === '1';
    const result = leadService.delete(req.params.id, permanent);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to delete lead',
      code: err.code || 'LEAD_DELETE_ERROR',
    });
  }
});
