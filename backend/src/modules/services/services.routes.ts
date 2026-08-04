import { Router } from 'express';

import { optionalAuth } from '@/common/middleware/optionalAuth.js';
import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';
import { companyIdParamsSchema, type CompanyIdParams } from '@/modules/companies/companies.schemas.js';

import {
  createServiceRequestSchema,
  publicServicesQuerySchema,
  serviceIdParamsSchema,
  serviceOnlyIdParamsSchema,
  updateServiceRequestSchema,
  type CreateServiceRequestInput,
  type PublicServicesQueryInput,
  type ServiceIdParams,
  type ServiceOnlyIdParams,
  type UpdateServiceRequestInput,
} from './services.schemas.js';
import {
  createService,
  getServiceById,
  getServiceStatusHistory,
  listCompanyServices,
  listPublicServices,
  updateService,
} from './services.service.js';

export const servicesRouter = Router();

servicesRouter.post(
  '/companies/:companyId/services',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  validate(createServiceRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const service = await createService(companyId, req.auth!.userId, req.body as CreateServiceRequestInput);
      res.status(201).json({ message: 'Service created', data: service });
    } catch (err) {
      next(err);
    }
  },
);

servicesRouter.get(
  '/companies/:companyId/services',
  optionalAuth,
  validate(companyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const services = await listCompanyServices(companyId, req.auth?.userId);
      res.status(200).json({ message: 'Company services', data: services });
    } catch (err) {
      next(err);
    }
  },
);

servicesRouter.patch(
  '/companies/:companyId/services/:serviceId',
  requireAuth,
  validate(serviceIdParamsSchema, 'params'),
  validate(updateServiceRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { companyId, serviceId } = req.params as unknown as ServiceIdParams;
      const service = await updateService(companyId, serviceId, req.auth!.userId, req.body as UpdateServiceRequestInput);
      res.status(200).json({ message: 'Service updated', data: service });
    } catch (err) {
      next(err);
    }
  },
);

servicesRouter.get(
  '/companies/:companyId/services/:serviceId/status-history',
  requireAuth,
  validate(serviceIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId, serviceId } = req.params as unknown as ServiceIdParams;
      const history = await getServiceStatusHistory(companyId, serviceId, req.auth!.userId);
      res.status(200).json({ message: 'Service status history', data: history });
    } catch (err) {
      next(err);
    }
  },
);

// Registered before `/services/:serviceId` so `public` is never captured as a `:serviceId` path param.
servicesRouter.get(
  '/services/public',
  validate(publicServicesQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery as unknown as PublicServicesQueryInput;
      const { items, meta } = await listPublicServices(query);
      res.status(200).json({ message: 'Published services', data: items, meta });
    } catch (err) {
      next(err);
    }
  },
);

servicesRouter.get(
  '/services/:serviceId',
  optionalAuth,
  validate(serviceOnlyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { serviceId } = req.params as unknown as ServiceOnlyIdParams;
      const service = await getServiceById(serviceId, req.auth?.userId);
      res.status(200).json({ message: 'Service found', data: service });
    } catch (err) {
      next(err);
    }
  },
);
