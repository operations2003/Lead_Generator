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

