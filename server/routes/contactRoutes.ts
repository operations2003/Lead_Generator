import { Router, Response } from 'express';
import { ContactService } from '../services/contactService';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { validateContactInput, validateContactUpdateInput } from '../middleware/validate';

export const contactRouter = Router();
const contactService = new ContactService();

// All contact routes require authentication
contactRouter.use(authenticateToken);

// GET /api/v1/contacts/check-duplicate - Real-time duplicate check for UI warning
contactRouter.get('/check-duplicate', requirePermission('contacts:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { email, companyId, excludeId } = req.query;
    if (!email) {
      res.status(200).json({
        success: true,
        data: { isDuplicate: false },
      });
      return;
    }

    const result = contactService.checkDuplicate(
      String(email),
      companyId ? String(companyId) : undefined,
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

// GET /api/v1/contacts - List / search / filter / paginate contacts
contactRouter.get('/', requirePermission('contacts:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      page,
      limit,
      search,
      role,
      companyId,
      decisionMaker,
      status,
      includeArchived,
      sortBy,
      sortOrder,
      jobTitle,
      title,
      company,
      productRelevance,
    } = req.query;

    const result = contactService.list({
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      search: search ? String(search) : undefined,
      role: role ? String(role) : undefined,
      jobTitle: jobTitle ? String(jobTitle) : (title ? String(title) : undefined),
      companyId: companyId ? String(companyId) : undefined,
      company: company ? String(company) : undefined,
      decisionMaker: decisionMaker !== undefined ? String(decisionMaker) : undefined,
      status: status ? String(status) : undefined,
      includeArchived: includeArchived === 'true' || includeArchived === '1',
      productRelevance: productRelevance ? String(productRelevance) : undefined,
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
      message: err.message || 'Failed to retrieve contacts',
      code: err.code || 'CONTACT_LIST_ERROR',
    });
  }
});

// GET /api/v1/contacts/:id - Get contact details with company and associated leads
contactRouter.get('/:id', requirePermission('contacts:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const contact = contactService.getById(req.params.id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Contact not found',
        code: 'CONTACT_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve contact details',
      code: err.code || 'CONTACT_DETAIL_ERROR',
    });
  }
});

// POST /api/v1/contacts - Create contact
contactRouter.post('/', requirePermission('contacts:write'), validateContactInput, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const contact = contactService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string; duplicateContact?: unknown };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to create contact',
      code: err.code || 'CONTACT_CREATE_ERROR',
      duplicateContact: err.duplicateContact,
    });
  }
});

// PATCH /api/v1/contacts/:id - Update contact
contactRouter.patch('/:id', requirePermission('contacts:write'), validateContactUpdateInput, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const contact = contactService.update(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string; duplicateContact?: unknown };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to update contact',
      code: err.code || 'CONTACT_UPDATE_ERROR',
      duplicateContact: err.duplicateContact,
    });
  }
});

// PATCH /api/v1/contacts/:id/decision-maker - Fast toggle decision maker flag
contactRouter.patch('/:id/decision-maker', requirePermission('contacts:write'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { decisionMaker } = req.body;
    const contact = contactService.toggleDecisionMaker(
      req.params.id,
      decisionMaker !== undefined ? Boolean(decisionMaker) : undefined
    );
    res.status(200).json({
      success: true,
      message: 'Decision maker status updated',
      data: contact,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to toggle decision maker status',
      code: err.code || 'DECISION_MAKER_TOGGLE_ERROR',
    });
  }
});

// DELETE /api/v1/contacts/:id - Archive or delete contact
contactRouter.delete('/:id', requirePermission('contacts:write'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const permanent = req.query.permanent === 'true' || req.query.permanent === '1';
    const result = contactService.delete(req.params.id, permanent);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to delete contact',
      code: err.code || 'CONTACT_DELETE_ERROR',
    });
  }
});
