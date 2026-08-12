import { Router } from 'express';

import { optionalAuth, requireAuth } from '../require-auth.js';
import type { SpecialistsService } from '../../modules/specialists/specialists.service.js';
import {
  createSpecialistProfileRequestSchema,
  publicSpecialistsQuerySchema,
  specialistIdParamsSchema,
  updateSpecialistProfileRequestSchema,
  type CreateSpecialistProfileRequestInput,
  type PublicSpecialistsQueryInput,
  type SpecialistIdParams,
  type UpdateSpecialistProfileRequestInput,
} from '../../modules/specialists/specialists.schemas.js';
import { validate } from '../validate.js';

export function createSpecialistsRouter(specialistsService: SpecialistsService): Router {
  const router = Router();

  router.post('/specialists/profile', requireAuth, validate(createSpecialistProfileRequestSchema, 'body'), async (req, res, next) => {
    try {
      const profile = await specialistsService.createMine(req.auth!.userId, req.body as CreateSpecialistProfileRequestInput);
      res.status(201).json({ message: 'Specialist profile created', data: profile });
    } catch (err) {
      next(err);
    }
  });

  // Registered before `/specialists/:specialistId` so `me`/`public` are never captured as a `:specialistId` path param.
  router.get('/specialists/me', requireAuth, async (req, res, next) => {
    try {
      const profile = await specialistsService.getMine(req.auth!.userId);
      res.status(200).json({ message: "Current user's specialist profile", data: profile });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/specialists/me', requireAuth, validate(updateSpecialistProfileRequestSchema, 'body'), async (req, res, next) => {
    try {
      const profile = await specialistsService.updateMine(req.auth!.userId, req.body as UpdateSpecialistProfileRequestInput);
      res.status(200).json({ message: 'Specialist profile updated', data: profile });
    } catch (err) {
      next(err);
    }
  });

  router.get('/specialists/me/status-history', requireAuth, async (req, res, next) => {
    try {
      const history = await specialistsService.getMyStatusHistory(req.auth!.userId);
      res.status(200).json({ message: "Current user's specialist profile status history", data: history });
    } catch (err) {
      next(err);
    }
  });

  router.get('/specialists/public', validate(publicSpecialistsQuerySchema, 'query'), async (req, res, next) => {
    try {
      const query = (req as unknown as { validatedQuery: PublicSpecialistsQueryInput }).validatedQuery;
      const { items, meta } = await specialistsService.getPublic(query);
      res.status(200).json({ message: 'Published specialist profiles', data: items, meta });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/specialists/:specialistId',
    optionalAuth,
    validate(specialistIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { specialistId } = req.params as unknown as SpecialistIdParams;
        const profile = await specialistsService.getById(specialistId, req.auth?.userId);
        res.status(200).json({ message: 'Specialist profile found', data: profile });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
