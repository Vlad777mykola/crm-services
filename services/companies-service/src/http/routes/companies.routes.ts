import { Router } from 'express';

import { optionalAuth, requireAuth } from '../require-auth.js';
import type { CompaniesService } from '../../modules/companies/companies.service.js';
import {
  companyIdParamsSchema,
  createCompanyRequestSchema,
  publicCompaniesQuerySchema,
  updateCompanyRequestSchema,
  type CompanyIdParams,
  type CreateCompanyRequestInput,
  type PublicCompaniesQueryInput,
  type UpdateCompanyRequestInput,
} from '../../modules/companies/companies.schemas.js';
import { validate } from '../validate.js';

export function createCompaniesRouter(companiesService: CompaniesService): Router {
  const router = Router();

  router.post('/companies', requireAuth, validate(createCompanyRequestSchema, 'body'), async (req, res, next) => {
    try {
      const company = await companiesService.create(req.body as CreateCompanyRequestInput, req.auth!.userId);
      res.status(201).json({ message: 'Company created', data: company });
    } catch (err) {
      next(err);
    }
  });

  // Registered before `/companies/:companyId` so `public`/`me` are never captured as a `:companyId` path param.
  router.get('/companies/public', validate(publicCompaniesQuerySchema, 'query'), async (req, res, next) => {
    try {
      const query = (req as unknown as { validatedQuery: PublicCompaniesQueryInput }).validatedQuery;
      const { items, meta } = await companiesService.getPublic(query);
      res.status(200).json({ message: 'Published companies', data: items, meta });
    } catch (err) {
      next(err);
    }
  });

  router.get('/companies/me', requireAuth, async (req, res, next) => {
    try {
      const memberships = await companiesService.getMyCompanies(req.auth!.userId);
      res.status(200).json({ message: "Current user's companies", data: memberships });
    } catch (err) {
      next(err);
    }
  });

  router.get('/companies/:companyId', optionalAuth, validate(companyIdParamsSchema, 'params'), async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const company = await companiesService.getById(companyId, req.auth?.userId);
      res.status(200).json({ message: 'Company found', data: company });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/companies/:companyId/status-history',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const history = await companiesService.getStatusHistory(companyId, req.auth!.userId);
        res.status(200).json({ message: 'Company status history', data: history });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/companies/:companyId',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    validate(updateCompanyRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const company = await companiesService.update(companyId, req.auth!.userId, req.body as UpdateCompanyRequestInput);
        res.status(200).json({ message: 'Company updated', data: company });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
