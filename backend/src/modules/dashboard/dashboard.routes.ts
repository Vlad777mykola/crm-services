import { Router } from 'express';

import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';
import { companyIdParamsSchema, type CompanyIdParams } from '@/modules/companies/companies.schemas.js';

import { getAppDashboardSummary, getCompanyDashboardSummary } from './dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.get('/app/summary', requireAuth, async (req, res, next) => {
  try {
    const summary = await getAppDashboardSummary(req.auth!.userId);
    res.status(200).json({ message: 'Dashboard summary', data: summary });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get(
  '/companies/:companyId/summary',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const summary = await getCompanyDashboardSummary(companyId, req.auth!.userId);
      res.status(200).json({ message: 'Company dashboard summary', data: summary });
    } catch (err) {
      next(err);
    }
  },
);
