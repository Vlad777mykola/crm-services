import { Router } from 'express';

import { requireAuth } from '../require-auth.js';
import type { CompanySpecialistsService } from '../../modules/company-specialists/company-specialists.service.js';
import {
  companyIdParamsSchema,
  requestIdParamsSchema,
  sendSpecialistRequestSchema,
  type CompanyIdParams,
  type RequestIdParams,
  type SendSpecialistRequestInput,
} from '../../modules/company-specialists/company-specialists.schemas.js';
import { validate } from '../validate.js';

export function createCompanySpecialistsRouter(service: CompanySpecialistsService): Router {
  const router = Router();

  router.post(
    '/companies/:companyId/specialists/requests',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    validate(sendSpecialistRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const request = await service.sendSpecialistRequest(
          companyId,
          req.auth!.userId,
          req.body as SendSpecialistRequestInput,
        );
        res.status(201).json({ message: 'Request sent', data: request });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/companies/:companyId/specialist-requests',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const requests = await service.listCompanySpecialistRequests(companyId, req.auth!.userId);
        res.status(200).json({ message: 'Company specialist requests', data: requests });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/companies/:companyId/specialists', validate(companyIdParamsSchema, 'params'), async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const specialists = await service.listCompanySpecialists(companyId);
      res.status(200).json({ message: 'Active specialists', data: specialists });
    } catch (err) {
      next(err);
    }
  });

  // Registered before specialists-service's `/specialists/:specialistId` catch-all -
  // Traefik routes these by priority regardless, but this ordering also protects
  // any future single-process mounting of both routers.
  router.get('/specialists/me/company-requests', requireAuth, async (req, res, next) => {
    try {
      const requests = await service.listMySpecialistCompanyRequests(req.auth!.userId);
      res.status(200).json({ message: 'Requests sent to your specialist profile', data: requests });
    } catch (err) {
      next(err);
    }
  });

  router.get('/specialists/me/companies', requireAuth, async (req, res, next) => {
    try {
      const companies = await service.listMySpecialistCompanies(req.auth!.userId);
      res.status(200).json({ message: 'Companies you work for', data: companies });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/specialists/me/company-requests/:requestId/accept',
    requireAuth,
    validate(requestIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { requestId } = req.params as unknown as RequestIdParams;
        const request = await service.acceptSpecialistCompanyRequest(requestId, req.auth!.userId);
        res.status(200).json({ message: 'Request accepted', data: request });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/specialists/me/company-requests/:requestId/reject',
    requireAuth,
    validate(requestIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { requestId } = req.params as unknown as RequestIdParams;
        const request = await service.rejectSpecialistCompanyRequest(requestId, req.auth!.userId);
        res.status(200).json({ message: 'Request rejected', data: request });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
