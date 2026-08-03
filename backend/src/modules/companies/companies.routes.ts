import { Router } from 'express';

import { optionalAuth } from '@/common/middleware/optionalAuth.js';
import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';

import {
  companyIdParamsSchema,
  createCompanyRequestSchema,
  updateCompanyRequestSchema,
  type CompanyIdParams,
  type CreateCompanyRequestInput,
  type UpdateCompanyRequestInput,
} from './companies.schemas.js';
import { createCompany, getCompanyById, getMyCompanies, getPublicCompanies, updateCompany } from './companies.service.js';

export const companiesRouter = Router();

companiesRouter.post('/companies', requireAuth, validate(createCompanyRequestSchema, 'body'), async (req, res, next) => {
  try {
    const company = await createCompany(req.body as CreateCompanyRequestInput, req.auth!.userId);
    res.status(201).json({ message: 'Company created', data: company });
  } catch (err) {
    next(err);
  }
});

// Registered before `/companies/:companyId` so `public`/`me` are never captured as a `:companyId` path param.
companiesRouter.get('/companies/public', async (_req, res, next) => {
  try {
    const companies = await getPublicCompanies();
    res.status(200).json({ message: 'Published companies', data: companies });
  } catch (err) {
    next(err);
  }
});

companiesRouter.get('/companies/me', requireAuth, async (req, res, next) => {
  try {
    const memberships = await getMyCompanies(req.auth!.userId);
    res.status(200).json({ message: "Current user's companies", data: memberships });
  } catch (err) {
    next(err);
  }
});

companiesRouter.get(
  '/companies/:companyId',
  optionalAuth,
  validate(companyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const company = await getCompanyById(companyId, req.auth?.userId);
      res.status(200).json({ message: 'Company found', data: company });
    } catch (err) {
      next(err);
    }
  },
);

companiesRouter.patch(
  '/companies/:companyId',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  validate(updateCompanyRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const company = await updateCompany(companyId, req.auth!.userId, req.body as UpdateCompanyRequestInput);
      res.status(200).json({ message: 'Company updated', data: company });
    } catch (err) {
      next(err);
    }
  },
);
