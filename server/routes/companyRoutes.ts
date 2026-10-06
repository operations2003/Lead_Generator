import { Router, Response } from 'express';
import { CompanyService } from '../services/companyService';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { validateCompanyInput, validateCompanyUpdateInput } from '../middleware/validate';

export const companyRouter = Router();
const companyService = new CompanyService();

// All company routes require authentication
companyRouter.use(authenticateToken);

// GET /api/v1/companies - List / search / filter / paginate companies
companyRouter.get('/', requirePermission('companies:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      page,
      limit,
      search,
      industry,
      location,
      status,
      employeeSize,
      productFit,
      includeArchived,
      sortBy,
      sortOrder,
    } = req.query;

    const result = companyService.list({
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      search: search ? String(search) : undefined,
      industry: industry ? String(industry) : undefined,
      location: location ? String(location) : undefined,
      status: status ? String(status) : undefined,
      employeeSize: employeeSize ? String(employeeSize) : undefined,
      productFit: productFit ? String(productFit) : undefined,
      includeArchived: includeArchived === 'true' || includeArchived === '1',
      sortBy: sortBy ? String(sortBy) : undefined,
      sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve companies',
      code: err.code || 'COMPANY_LIST_ERROR',
    });
  }
});

// GET /api/v1/companies/:id - Get company details with contacts and leads
companyRouter.get('/:id', requirePermission('companies:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const company = companyService.getById(req.params.id);
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve company details',
      code: err.code || 'COMPANY_DETAIL_ERROR',
    });
  }
});

// POST /api/v1/companies - Create company
companyRouter.post('/', requirePermission('companies:write'), validateCompanyInput, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const company = companyService.create(req.body, req.user?.id);
    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to create company',
      code: err.code || 'COMPANY_CREATE_ERROR',
    });
  }
});

// PATCH /api/v1/companies/:id - Update company
companyRouter.patch('/:id', requirePermission('companies:write'), validateCompanyUpdateInput, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const company = companyService.update(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to update company',
      code: err.code || 'COMPANY_UPDATE_ERROR',
    });
  }
});

// PUT /api/v1/companies/:id - Support PUT as alias to update
companyRouter.put('/:id', requirePermission('companies:write'), validateCompanyUpdateInput, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const company = companyService.update(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to update company',
      code: err.code || 'COMPANY_UPDATE_ERROR',
    });
  }
});

// DELETE /api/v1/companies/:id - Archive or permanently delete company
companyRouter.delete('/:id', requirePermission('companies:write'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const permanent = req.query.permanent === 'true' || req.query.permanent === '1';
    const result = companyService.delete(req.params.id, permanent);
    res.status(200).json({
      success: true,
      message: result.message,
      data: { message: result.message },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to delete company',
      code: err.code || 'COMPANY_DELETE_ERROR',
    });
  }
});
