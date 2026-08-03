import { Router } from 'express';

import { optionalAuth } from '@/common/middleware/optionalAuth.js';
import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';

import {
  assignServiceSpecialistRequestSchema,
  serviceSpecialistParamsSchema,
  type AssignServiceSpecialistInput,
  type ServiceSpecialistParams,
} from './service-specialists.schemas.js';
import {
  assignServiceSpecialist,
  listMySpecialistServices,
  listServiceSpecialists,
  unassignServiceSpecialist,
} from './service-specialists.service.js';
import { serviceOnlyIdParamsSchema, type ServiceOnlyIdParams } from './services.schemas.js';

export const serviceSpecialistsRouter = Router();

serviceSpecialistsRouter.post(
  '/services/:serviceId/specialists',
  requireAuth,
  validate(serviceOnlyIdParamsSchema, 'params'),
  validate(assignServiceSpecialistRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { serviceId } = req.params as unknown as ServiceOnlyIdParams;
      const assignment = await assignServiceSpecialist(
        serviceId,
        req.auth!.userId,
        req.body as AssignServiceSpecialistInput,
      );
      res.status(201).json({ message: 'Specialist assigned', data: assignment });
    } catch (err) {
      next(err);
    }
  },
);

serviceSpecialistsRouter.get(
  '/services/:serviceId/specialists',
  optionalAuth,
  validate(serviceOnlyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { serviceId } = req.params as unknown as ServiceOnlyIdParams;
      const specialists = await listServiceSpecialists(serviceId, req.auth?.userId);
      res.status(200).json({ message: 'Assigned specialists', data: specialists });
    } catch (err) {
      next(err);
    }
  },
);

serviceSpecialistsRouter.delete(
  '/services/:serviceId/specialists/:specialistProfileId',
  requireAuth,
  validate(serviceSpecialistParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { serviceId, specialistProfileId } = req.params as unknown as ServiceSpecialistParams;
      const assignment = await unassignServiceSpecialist(serviceId, specialistProfileId, req.auth!.userId);
      res.status(200).json({ message: 'Specialist unassigned', data: assignment });
    } catch (err) {
      next(err);
    }
  },
);

// More path segments than `/specialists/:specialistId` (in specialists.routes.ts), so registration
// order relative to that catch-all route never matters here.
serviceSpecialistsRouter.get('/specialists/me/services', requireAuth, async (req, res, next) => {
  try {
    const services = await listMySpecialistServices(req.auth!.userId);
    res.status(200).json({ message: 'Services you are assigned to perform', data: services });
  } catch (err) {
    next(err);
  }
});
