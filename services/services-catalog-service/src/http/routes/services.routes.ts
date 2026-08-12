import { Router } from 'express';

import { optionalAuth, requireAuth } from '../require-auth.js';
import type { ServicesService } from '../../modules/services/services.service.js';
import {
  companyIdParamsSchema,
  createServiceRequestSchema,
  publicServicesQuerySchema,
  serviceIdParamsSchema,
  serviceOnlyIdParamsSchema,
  updateServiceRequestSchema,
  type CompanyIdParams,
  type CreateServiceRequestInput,
  type PublicServicesQueryInput,
  type ServiceIdParams,
  type ServiceOnlyIdParams,
  type UpdateServiceRequestInput,
} from '../../modules/services/services.schemas.js';
import { validate } from '../validate.js';

export function createServicesRouter(servicesService: ServicesService): Router {
  const router = Router();

  router.post(
    '/companies/:companyId/services',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    validate(createServiceRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const service = await servicesService.create(companyId, req.auth!.userId, req.body as CreateServiceRequestInput);
        res.status(201).json({ message: 'Service created', data: service });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/companies/:companyId/services',
    optionalAuth,
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const services = await servicesService.listByCompany(companyId, req.auth?.userId);
        res.status(200).json({ message: 'Company services', data: services });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/companies/:companyId/services/:serviceId',
    requireAuth,
    validate(serviceIdParamsSchema, 'params'),
    validate(updateServiceRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, serviceId } = req.params as unknown as ServiceIdParams;
        const service = await servicesService.update(
          companyId,
          serviceId,
          req.auth!.userId,
          req.body as UpdateServiceRequestInput,
        );
        res.status(200).json({ message: 'Service updated', data: service });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/companies/:companyId/services/:serviceId/status-history',
    requireAuth,
    validate(serviceIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId, serviceId } = req.params as unknown as ServiceIdParams;
        const history = await servicesService.getStatusHistory(companyId, serviceId, req.auth!.userId);
        res.status(200).json({ message: 'Service status history', data: history });
      } catch (err) {
        next(err);
      }
    },
  );

  // Registered before `/services/:serviceId` so `public` is never captured as a `:serviceId` path param.
  router.get('/services/public', validate(publicServicesQuerySchema, 'query'), async (req, res, next) => {
    try {
      const query = (req as unknown as { validatedQuery: PublicServicesQueryInput }).validatedQuery;
      const { items, meta } = await servicesService.listPublic(query);
      res.status(200).json({ message: 'Published services', data: items, meta });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/services/:serviceId',
    optionalAuth,
    validate(serviceOnlyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { serviceId } = req.params as unknown as ServiceOnlyIdParams;
        const service = await servicesService.getById(serviceId, req.auth?.userId);
        res.status(200).json({ message: 'Service found', data: service });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
