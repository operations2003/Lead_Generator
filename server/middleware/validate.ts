import { Request, Response, NextFunction } from 'express';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({
      success: false,
      message: 'A valid email address is required',
      code: 'INVALID_EMAIL',
    });
    return;
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Password is required',
      code: 'MISSING_PASSWORD',
    });
    return;
  }

  next();
}

export function validateRegisterInput(req: Request, res: Response, next: NextFunction): void {
  const { email, password, firstName, lastName, role } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({
      success: false,
      message: 'A valid email address is required',
      code: 'INVALID_EMAIL',
    });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
      code: 'WEAK_PASSWORD',
    });
    return;
  }

  // Strong password check: at least 1 number or special character
  if (!/(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*])/.test(password)) {
    res.status(400).json({
      success: false,
      message: 'Password must contain both letters and at least one number or symbol',
      code: 'WEAK_PASSWORD',
    });
    return;
  }

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'First name is required',
      code: 'MISSING_FIRST_NAME',
    });
    return;
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Last name is required',
      code: 'MISSING_LAST_NAME',
    });
    return;
  }

  const validRoles = ['admin', 'manager', 'sales_rep', 'viewer'];
  if (role && !validRoles.includes(role)) {
    res.status(400).json({
      success: false,
      message: `Invalid role specified. Valid roles are: ${validRoles.join(', ')}`,
      code: 'INVALID_ROLE',
    });
    return;
  }

  next();
}

const URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;

export function validateCompanyInput(req: Request, res: Response, next: NextFunction): void {
  const { name, website, industry, location, employeeSize, productFit, leadRelevanceScore, status } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Company name is required',
      code: 'MISSING_COMPANY_NAME',
    });
    return;
  }

  if (!website || typeof website !== 'string' || !URL_REGEX.test(website.trim())) {
    res.status(400).json({
      success: false,
      message: 'A valid website or domain is required (e.g., https://example.com or example.com)',
      code: 'INVALID_WEBSITE',
    });
    return;
  }

  if (!industry || typeof industry !== 'string' || industry.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Industry is required',
      code: 'MISSING_INDUSTRY',
    });
    return;
  }

  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Location is required',
      code: 'MISSING_LOCATION',
    });
    return;
  }

  if (!employeeSize || typeof employeeSize !== 'string' || employeeSize.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Employee size is required',
      code: 'MISSING_EMPLOYEE_SIZE',
    });
    return;
  }

  const validFits = ['High', 'Medium', 'Low'];
  if (productFit && !validFits.includes(productFit)) {
    res.status(400).json({
      success: false,
      message: `Invalid productFit. Must be one of: ${validFits.join(', ')}`,
      code: 'INVALID_PRODUCT_FIT',
    });
    return;
  }

  if (leadRelevanceScore !== undefined && (typeof leadRelevanceScore !== 'number' || leadRelevanceScore < 0 || leadRelevanceScore > 100)) {
    res.status(400).json({
      success: false,
      message: 'leadRelevanceScore must be a number between 0 and 100',
      code: 'INVALID_RELEVANCE_SCORE',
    });
    return;
  }

  const validStatuses = ['Prospect', 'Researching', 'Contacted', 'Qualified', 'Customer', 'Archived', 'Unqualified'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      code: 'INVALID_STATUS',
    });
    return;
  }

  next();
}

export function validateCompanyUpdateInput(req: Request, res: Response, next: NextFunction): void {
  const { name, website, industry, location, employeeSize, productFit, leadRelevanceScore, status } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Company name cannot be empty',
      code: 'INVALID_COMPANY_NAME',
    });
    return;
  }

  if (website !== undefined && (typeof website !== 'string' || !URL_REGEX.test(website.trim()))) {
    res.status(400).json({
      success: false,
      message: 'A valid website or domain is required',
      code: 'INVALID_WEBSITE',
    });
    return;
  }

  if (industry !== undefined && (typeof industry !== 'string' || industry.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Industry cannot be empty',
      code: 'INVALID_INDUSTRY',
    });
    return;
  }

  if (location !== undefined && (typeof location !== 'string' || location.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Location cannot be empty',
      code: 'INVALID_LOCATION',
    });
    return;
  }

  if (employeeSize !== undefined && (typeof employeeSize !== 'string' || employeeSize.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Employee size cannot be empty',
      code: 'INVALID_EMPLOYEE_SIZE',
    });
    return;
  }

  const validFits = ['High', 'Medium', 'Low'];
  if (productFit !== undefined && !validFits.includes(productFit)) {
    res.status(400).json({
      success: false,
      message: `Invalid productFit. Must be one of: ${validFits.join(', ')}`,
      code: 'INVALID_PRODUCT_FIT',
    });
    return;
  }

  if (leadRelevanceScore !== undefined && (typeof leadRelevanceScore !== 'number' || leadRelevanceScore < 0 || leadRelevanceScore > 100)) {
    res.status(400).json({
      success: false,
      message: 'leadRelevanceScore must be a number between 0 and 100',
      code: 'INVALID_RELEVANCE_SCORE',
    });
    return;
  }

  const validStatuses = ['Prospect', 'Researching', 'Contacted', 'Qualified', 'Customer', 'Archived', 'Unqualified'];
  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      code: 'INVALID_STATUS',
    });
    return;
  }

  next();
}

export function validateContactInput(req: Request, res: Response, next: NextFunction): void {
  const { name, title, companyId, email, status } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Contact name is required',
      code: 'MISSING_NAME',
    });
    return;
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Job title is required',
      code: 'MISSING_TITLE',
    });
    return;
  }

  if (!companyId || typeof companyId !== 'string' || companyId.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Company association (companyId) is required',
      code: 'MISSING_COMPANY_ID',
    });
    return;
  }

  if (email && typeof email === 'string' && email.trim().length > 0) {
    if (!EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        message: 'Invalid email address format',
        code: 'INVALID_EMAIL_FORMAT',
      });
      return;
    }
  }

  const validStatuses = ['Active', 'Contacted', 'Qualified', 'Unresponsive', 'Archived'];
  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      code: 'INVALID_STATUS',
    });
    return;
  }

  next();
}

export function validateContactUpdateInput(req: Request, res: Response, next: NextFunction): void {
  const { name, title, companyId, email, status } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Contact name cannot be empty',
      code: 'INVALID_NAME',
    });
    return;
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Job title cannot be empty',
      code: 'INVALID_TITLE',
    });
    return;
  }

  if (companyId !== undefined && (typeof companyId !== 'string' || companyId.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Company association cannot be empty',
      code: 'INVALID_COMPANY_ID',
    });
    return;
  }

  if (email !== undefined && typeof email === 'string' && email.trim().length > 0) {
    if (!EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        message: 'Invalid email address format',
        code: 'INVALID_EMAIL_FORMAT',
      });
      return;
    }
  }

  const validStatuses = ['Active', 'Contacted', 'Qualified', 'Unresponsive', 'Archived'];
  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      code: 'INVALID_STATUS',
    });
    return;
  }

  next();
}

export function validateLeadInput(req: Request, res: Response, next: NextFunction): void {
  const { title, companyId, product, priority, status, hiringVolume } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Lead title is required',
      code: 'MISSING_TITLE',
    });
    return;
  }

  if (!companyId || typeof companyId !== 'string' || companyId.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Company association is required',
      code: 'MISSING_COMPANY_ID',
    });
    return;
  }

  const validProducts = ['Higher IQ', 'HRMS Portal', 'Both'];
  if (!product || !validProducts.includes(product)) {
    res.status(400).json({
      success: false,
      message: `Invalid product. Must be one of: ${validProducts.join(', ')}`,
      code: 'INVALID_PRODUCT',
    });
    return;
  }

  const validPriorities = ['High', 'Medium', 'Low'];
  if (priority !== undefined && !validPriorities.includes(priority)) {
    res.status(400).json({
      success: false,
      message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      code: 'INVALID_PRIORITY',
    });
    return;
  }

  const validStages = [
    'New',
    'Contacted',
    'Replied',
    'Demo Booked',
    'Demo Done',
    'Won',
    'Lost',
    'Archived',
  ];
  if (status !== undefined && !validStages.includes(status)) {
    res.status(400).json({
      success: false,
      message: `Invalid stage status. Must be one of: ${validStages.join(', ')}`,
      code: 'INVALID_STATUS',
    });
    return;
  }

  const validHiringVolumes = ['High', 'Medium', 'Low', 'None'];
  if (hiringVolume !== undefined && !validHiringVolumes.includes(hiringVolume)) {
    res.status(400).json({
      success: false,
      message: `Invalid hiring volume. Must be one of: ${validHiringVolumes.join(', ')}`,
      code: 'INVALID_HIRING_VOLUME',
    });
    return;
  }

  next();
}

export function validateLeadUpdateInput(req: Request, res: Response, next: NextFunction): void {
  const { title, companyId, product, priority, status, hiringVolume } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Lead title cannot be empty',
      code: 'INVALID_TITLE',
    });
    return;
  }

  if (companyId !== undefined && (typeof companyId !== 'string' || companyId.trim().length === 0)) {
    res.status(400).json({
      success: false,
      message: 'Company association cannot be empty',
      code: 'INVALID_COMPANY_ID',
    });
    return;
  }

  const validProducts = ['Higher IQ', 'HRMS Portal', 'Both'];
  if (product !== undefined && !validProducts.includes(product)) {
    res.status(400).json({
      success: false,
      message: `Invalid product. Must be one of: ${validProducts.join(', ')}`,
      code: 'INVALID_PRODUCT',
    });
    return;
  }

  const validPriorities = ['High', 'Medium', 'Low'];
  if (priority !== undefined && !validPriorities.includes(priority)) {
    res.status(400).json({
      success: false,
      message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      code: 'INVALID_PRIORITY',
    });
    return;
  }

  const validStages = [
    'New',
    'Contacted',
    'Replied',
    'Demo Booked',
    'Demo Done',
    'Won',
    'Lost',
    'Archived',
  ];
  if (status !== undefined && !validStages.includes(status)) {
    res.status(400).json({
      success: false,
      message: `Invalid stage status. Must be one of: ${validStages.join(', ')}`,
      code: 'INVALID_STATUS',
    });
    return;
  }

  const validHiringVolumes = ['High', 'Medium', 'Low', 'None'];
  if (hiringVolume !== undefined && !validHiringVolumes.includes(hiringVolume)) {
    res.status(400).json({
      success: false,
      message: `Invalid hiring volume. Must be one of: ${validHiringVolumes.join(', ')}`,
      code: 'INVALID_HIRING_VOLUME',
    });
    return;
  }

  next();
}

export function validateStageChangeInput(req: Request, res: Response, next: NextFunction): void {
  const { stage, lostReason } = req.body;

  const validStages = [
    'New',
    'Contacted',
    'Replied',
    'Demo Booked',
    'Demo Done',
    'Won',
    'Lost',
    'Archived',
  ];

  if (!stage || typeof stage !== 'string' || !validStages.includes(stage)) {
    res.status(400).json({
      success: false,
      message: `A valid stage is required. Must be one of: ${validStages.join(', ')}`,
      code: 'INVALID_STAGE',
    });
    return;
  }

  if (stage === 'Lost' && (!lostReason || typeof lostReason !== 'string' || !lostReason.trim())) {
    res.status(400).json({
      success: false,
      message: 'A lostReason is mandatory when transitioning a lead to Lost stage',
      code: 'MISSING_LOST_REASON',
    });
    return;
  }

  next();
}

