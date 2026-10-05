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
