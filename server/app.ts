import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './routes/authRoutes';
import { userRouter } from './routes/userRoutes';
import { companyRouter } from './routes/companyRoutes';
import { contactRouter } from './routes/contactRoutes';
import { leadRouter } from './routes/leadRoutes';
import { activityRouter } from './routes/activityRoutes';
import { followUpRouter } from './routes/followUpRoutes';

export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    })
  );

  app.use(express.json());

  // Health check endpoint
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Lead Generator Auth & CRM API',
    });
  });

  // API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/companies', companyRouter);
  app.use('/api/v1/contacts', contactRouter);
  app.use('/api/v1/leads', leadRouter);
  app.use('/api/v1/activities', activityRouter);
  app.use('/api/v1/follow-ups', followUpRouter);

  // 404 Not Found Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Resource not found: ${req.method} ${req.path}`,
      code: 'NOT_FOUND',
    });
  });

  // Global Error Handler
  app.use((err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'An unexpected internal server error occurred',
      code: err.code || 'INTERNAL_SERVER_ERROR',
    });
  });

  return app;
}
