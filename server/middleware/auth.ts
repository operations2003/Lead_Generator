import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { SafeUser } from '../db/types';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
  token?: string;
}

const authService = new AuthService();

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: 'Authentication token required',
      code: 'AUTH_TOKEN_MISSING',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      message: 'Malformed authorization header format. Format must be: Bearer <token>',
      code: 'AUTH_TOKEN_MALFORMED',
    });
    return;
  }

  const token = parts[1];

  try {
    const { user } = authService.validateSession(token);
    req.user = user;
    req.token = token;
    next();
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    const status = err.status || 401;
    res.status(status).json({
      success: false,
      message: err.message || 'Invalid or expired authentication session',
      code: status === 403 ? 'AUTH_FORBIDDEN' : 'AUTH_SESSION_INVALID',
    });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions',
        code: 'UNAUTHENTICATED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        code: 'FORBIDDEN_ROLE',
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions',
        code: 'UNAUTHENTICATED',
      });
      return;
    }

    const userPerms = req.user.permissions || [];
    const missingPermissions = requiredPermissions.filter((p) => !userPerms.includes(p));

    if (missingPermissions.length > 0) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You do not possess the necessary permissions for this operation.',
        code: 'FORBIDDEN_PERMISSION',
        missingPermissions,
      });
      return;
    }

    next();
  };
}

export const requireAuth = authenticateToken;
