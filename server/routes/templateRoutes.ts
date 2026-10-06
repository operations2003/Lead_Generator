import { Router, Request, Response } from 'express';
import { templateService } from '../services/templateService';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateTemplateInput } from '../middleware/validate';
import { OutreachTemplateType } from '../db/types';

export const templateRouter = Router();

templateRouter.use(requireAuth);

/**
 * GET /api/v1/templates
 * List outreach templates
 */
templateRouter.get('/', requirePermission('leads:read'), async (req: Request, res: Response) => {
  try {
    const { type, product, status, search } = req.query;
    const templates = templateService.getTemplates({
      type: type ? (String(type) as OutreachTemplateType) : undefined,
      product: product ? String(product) : undefined,
      status: status ? (String(status) as 'Active' | 'Archived') : undefined,
      search: search ? String(search) : undefined,
    });

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message,
      code: 'TEMPLATE_FETCH_ERROR',
    });
  }
});

/**
 * GET /api/v1/templates/:id
 * Retrieve single template by id
 */
templateRouter.get('/:id', requirePermission('leads:read'), async (req: Request, res: Response) => {
  try {
    const template = templateService.getTemplateById(req.params.id);
    if (!template) {
      res.status(404).json({
        success: false,
        message: `Template with id "${req.params.id}" not found`,
        code: 'TEMPLATE_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message,
      code: 'TEMPLATE_FETCH_ERROR',
    });
  }
});

/**
 * POST /api/v1/templates
 * Create an outreach template
 */
templateRouter.post('/', requirePermission('leads:write'), validateTemplateInput, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const template = templateService.createTemplate(
      {
        name: req.body.name,
        type: req.body.type,
        product: req.body.product,
        subject: req.body.subject,
        body: req.body.body,
        sequenceDay: req.body.sequenceDay,
      },
      userId
    );

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: (err as Error).message,
      code: 'TEMPLATE_CREATE_ERROR',
    });
  }
});

/**
 * PATCH /api/v1/templates/:id
 * Update template
 */
templateRouter.patch('/:id', requirePermission('leads:write'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const template = templateService.updateTemplate(req.params.id, req.body, userId);
    res.status(200).json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({
      success: false,
      message,
      code: 'TEMPLATE_UPDATE_ERROR',
    });
  }
});

/**
 * DELETE /api/v1/templates/:id
 * Delete template
 */
templateRouter.delete('/:id', requirePermission('leads:write'), async (req: Request, res: Response) => {
  try {
    const success = templateService.deleteTemplate(req.params.id);
    if (!success) {
      res.status(404).json({
        success: false,
        message: `Template with id "${req.params.id}" not found`,
        code: 'TEMPLATE_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message,
      code: 'TEMPLATE_DELETE_ERROR',
    });
  }
});
