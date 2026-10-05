import { Router, Response } from 'express';
import { AuthService } from '../services/authService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateLoginInput, validateRegisterInput } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();
const authService = new AuthService();

// POST /api/v1/auth/login
authRouter.post(
  '/login',
  authRateLimiter,
  validateLoginInput,
  async (req, res): Promise<void> => {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(email, password, ip, userAgent);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        message: err.message || 'Authentication failed',
        code: status === 401 ? 'INVALID_CREDENTIALS' : status === 429 ? 'ACCOUNT_LOCKED' : 'AUTH_ERROR',
      });
    }
  }
);

// POST /api/v1/auth/register
authRouter.post(
  '/register',
  authRateLimiter,
  validateRegisterInput,
  async (req, res): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      const newUser = await authService.register({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: newUser,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        message: err.message || 'Registration failed',
        code: status === 409 ? 'USER_EXISTS' : 'REGISTRATION_ERROR',
      });
    }
  }
);

// POST /api/v1/auth/logout
authRouter.post(
  '/logout',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      if (req.token) {
        authService.logout(req.token);
      }
      res.status(200).json({
        success: true,
        message: 'Logged out successfully and session invalidated',
      });
    } catch (_error: unknown) {
      res.status(500).json({
        success: false,
        message: 'Failed to complete logout',
        code: 'LOGOUT_ERROR',
      });
    }
  }
);

// GET /api/v1/auth/me
authRouter.get(
  '/me',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  }
);

// GET /api/v1/auth/verify-session
authRouter.get(
  '/verify-session',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'Session is valid',
      data: {
        valid: true,
        user: req.user,
      },
    });
  }
);
