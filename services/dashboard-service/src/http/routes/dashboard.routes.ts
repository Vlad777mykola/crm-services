import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../http/require-auth.js';
import type { DashboardService } from './dashboard.service.js';

const companyIdParamsSchema = z.object({
  companyId: z.uuid(),
});

export function createDashboardRouter(dashboardService: DashboardService): Router {
  const router = Router();

  router.get('/app/summary', requireAuth, async (req, res, next) => {
    try {
      const summary = await dashboardService.getAppDashboardSummary(req.auth!.userId);
      res.status(200).json({ message: 'Dashboard summary', data: summary });
    } catch (err) {
      next(err);
    }
  });

  router.get('/companies/:companyId/summary', requireAuth, async (req, res, next) => {
    try {
      const parsed = companyIdParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({ error: { message: 'Invalid company id', statusCode: 400 } });
        return;
      }
      const summary = await dashboardService.getCompanyDashboardSummary(
        parsed.data.companyId,
        req.auth!.userId,
      );
      res.status(200).json({ message: 'Company dashboard summary', data: summary });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
