import { Router } from 'express';

import { optionalAuth, requireAuth } from '../require-auth.js';
import type { ServiceSpecialistsService } from '../../modules/services/service-specialists.service.js';
import {
  assignServiceSpecialistRequestSchema,
  serviceSpecialistParamsSchema,
  type AssignServiceSpecialistInput,
  type ServiceSpecialistParams,
} from '../../modules/services/service-specialists.schemas.js';
import { serviceOnlyIdParamsSchema, type ServiceOnlyIdParams } from '../../modules/services/services.schemas.js';
import { validate } from '../validate.js';

export function createServiceSpecialistsRouter(service: ServiceSpecialistsService): Router {
  const router = Router();

  router.post(
    '/services/:serviceId/specialists',
    requireAuth,
    validate(serviceOnlyIdParamsSchema, 'params'),
    validate(assignServiceSpecialistRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { serviceId } = req.params as unknown as ServiceOnlyIdParams;
        const assignment = await service.assign(serviceId, req.auth!.userId, req.body as AssignServiceSpecialistInput);
        res.status(201).json({ message: 'Specialist assigned', data: assignment });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/services/:serviceId/specialists',
    optionalAuth,
    validate(serviceOnlyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { serviceId } = req.params as unknown as ServiceOnlyIdParams;
        const specialists = await service.list(serviceId, req.auth?.userId);
        res.status(200).json({ message: 'Assigned specialists', data: specialists });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    '/services/:serviceId/specialists/:specialistProfileId',
    requireAuth,
    validate(serviceSpecialistParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { serviceId, specialistProfileId } = req.params as unknown as ServiceSpecialistParams;
        const assignment = await service.unassign(serviceId, specialistProfileId, req.auth!.userId);
        res.status(200).json({ message: 'Specialist unassigned', data: assignment });
      } catch (err) {
        next(err);
      }
    },
  );

  // More path segments than specialists-service's `/specialists/:specialistId` catch-all,
  // so registration order relative to it never matters here.
  router.get('/specialists/me/services', requireAuth, async (req, res, next) => {
    try {
      const services = await service.listMine(req.auth!.userId);
      res.status(200).json({ message: 'Services you are assigned to perform', data: services });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
