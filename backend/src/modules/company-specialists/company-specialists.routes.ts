import { Router } from 'express';

import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';
import { companyIdParamsSchema, type CompanyIdParams } from '@/modules/companies/companies.schemas.js';

import {
  acceptSpecialistCompanyRequest,
  listCompanySpecialistRequests,
  listCompanySpecialists,
  listMySpecialistCompanies,
  listMySpecialistCompanyRequests,
  rejectSpecialistCompanyRequest,
  sendSpecialistRequest,
} from './company-specialists.service.js';
import {
  requestIdParamsSchema,
  sendSpecialistRequestSchema,
  type RequestIdParams,
  type SendSpecialistRequestInput,
} from './company-specialists.schemas.js';

export const companySpecialistsRouter = Router();

companySpecialistsRouter.post(
  '/companies/:companyId/specialists/requests',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  validate(sendSpecialistRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const request = await sendSpecialistRequest(companyId, req.auth!.userId, req.body as SendSpecialistRequestInput);
      res.status(201).json({ message: 'Request sent', data: request });
    } catch (err) {
      next(err);
    }
  },
);

companySpecialistsRouter.get(
  '/companies/:companyId/specialist-requests',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const requests = await listCompanySpecialistRequests(companyId, req.auth!.userId);
      res.status(200).json({ message: 'Company specialist requests', data: requests });
    } catch (err) {
      next(err);
    }
  },
);

companySpecialistsRouter.get(
  '/companies/:companyId/specialists',
  validate(companyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const specialists = await listCompanySpecialists(companyId);
      res.status(200).json({ message: 'Active specialists', data: specialists });
    } catch (err) {
      next(err);
    }
  },
);

// Registered before `/specialists/:specialistId` (in specialists.routes.ts) can never match these -
// they have more path segments than that single-segment catch-all.
companySpecialistsRouter.get('/specialists/me/company-requests', requireAuth, async (req, res, next) => {
  try {
    const requests = await listMySpecialistCompanyRequests(req.auth!.userId);
    res.status(200).json({ message: 'Requests sent to your specialist profile', data: requests });
  } catch (err) {
    next(err);
  }
});

companySpecialistsRouter.get('/specialists/me/companies', requireAuth, async (req, res, next) => {
  try {
    const companies = await listMySpecialistCompanies(req.auth!.userId);
    res.status(200).json({ message: 'Companies you work for', data: companies });
  } catch (err) {
    next(err);
  }
});

companySpecialistsRouter.post(
  '/specialists/me/company-requests/:requestId/accept',
  requireAuth,
  validate(requestIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { requestId } = req.params as unknown as RequestIdParams;
      const request = await acceptSpecialistCompanyRequest(requestId, req.auth!.userId);
      res.status(200).json({ message: 'Request accepted', data: request });
    } catch (err) {
      next(err);
    }
  },
);

companySpecialistsRouter.post(
  '/specialists/me/company-requests/:requestId/reject',
  requireAuth,
  validate(requestIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { requestId } = req.params as unknown as RequestIdParams;
      const request = await rejectSpecialistCompanyRequest(requestId, req.auth!.userId);
      res.status(200).json({ message: 'Request rejected', data: request });
    } catch (err) {
      next(err);
    }
  },
);
