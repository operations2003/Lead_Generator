import { Router, Response } from 'express';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { authenticateToken, requireRole, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { validateRegisterInput } from '../middleware/validate';

export const userRouter = Router();
const userService = new UserService();
const authService = new AuthService();

// All user management routes require valid authentication
userRouter.use(authenticateToken);

// GET /api/v1/users - View all users (requires users:read permission or admin/manager role)
userRouter.get(
  '/',
  requirePermission('users:read'),
  (_req: AuthenticatedRequest, res: Response): void => {
    try {
      const users = userService.getAllUsers();
      res.status(200).json({
        success: true,
        data: users,
        total: users.length,
      });
    } catch (_error: unknown) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        code: 'USER_FETCH_ERROR',
      });
    }
  }
);

// POST /api/v1/users - Create new user (requires users:manage permission)
userRouter.post(
  '/',
  requirePermission('users:manage'),
  validateRegisterInput,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      const user = await authService.register({
        email,
        password,
        firstName,
        lastName,
        role: role || 'sales_rep',
      });
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        message: err.message || 'Failed to create user',
        code: status === 409 ? 'USER_EXISTS' : 'USER_CREATE_ERROR',
      });
    }
  }
);

// PATCH /api/v1/users/:id/status - Update user status (requires admin role)
userRouter.patch(
  '/:id/status',
  requireRole('admin'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'suspended'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: active, inactive, suspended',
          code: 'INVALID_STATUS',
        });
        return;
      }

      const updated = userService.updateStatus(id, status);
      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `User status updated to ${status}`,
        data: updated,
      });
    } catch (_error: unknown) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        code: 'USER_UPDATE_ERROR',
      });
    }
  }
);

// PATCH /api/v1/users/:id/role - Update user role (requires admin role)
userRouter.patch(
  '/:id/role',
  requireRole('admin'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const validRoles = ['admin', 'manager', 'sales_rep', 'viewer'];

      if (!validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          code: 'INVALID_ROLE',
        });
        return;
      }

      const updated = userService.updateRole(id, role);
      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `User role updated to ${role}`,
        data: updated,
      });
    } catch (_error: unknown) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user role',
        code: 'USER_UPDATE_ERROR',
      });
    }
  }
);
