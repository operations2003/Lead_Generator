import { Router, Request, Response } from 'express';
import { targetService } from '../services/targetService';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateWeeklyTargetInput } from '../middleware/validate';

export const targetRouter = Router();

targetRouter.use(requireAuth);

/**
 * GET /api/v1/targets/weekly
 * Retrieve weekly targets with real database actuals and achievement percentages
 */
targetRouter.get('/weekly', requirePermission('leads:read'), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const targets = targetService.getWeeklyTargets(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined,
      userId ? String(userId) : null
    );

    res.status(200).json({
      success: true,
      data: targets,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message,
      code: 'TARGETS_FETCH_ERROR',
    });
  }
});

/**
 * POST /api/v1/targets/weekly
 * Save or update a weekly target
 */
targetRouter.post('/weekly', requirePermission('leads:write'), validateWeeklyTargetInput, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const saved = targetService.saveWeeklyTarget(
      {
        targetType: req.body.targetType,
        targetValue: req.body.targetValue,
        userId: req.body.userId,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
      },
      userId
    );

    res.status(200).json({
      success: true,
      data: saved,
      message: 'Weekly target configured successfully',
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: (err as Error).message,
      code: 'TARGETS_SAVE_ERROR',
    });
  }
});
