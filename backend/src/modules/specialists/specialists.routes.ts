import { Router } from 'express';

import { optionalAuth } from '@/common/middleware/optionalAuth.js';
import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';

import {
  createSpecialistProfileRequestSchema,
  publicSpecialistsQuerySchema,
  specialistIdParamsSchema,
  updateSpecialistProfileRequestSchema,
  type CreateSpecialistProfileRequestInput,
  type PublicSpecialistsQueryInput,
  type SpecialistIdParams,
  type UpdateSpecialistProfileRequestInput,
} from './specialists.schemas.js';
import {
  createMySpecialistProfile,
  getMySpecialistProfile,
  getMySpecialistStatusHistory,
  getPublicSpecialists,
  getSpecialistById,
  updateMySpecialistProfile,
} from './specialists.service.js';

export const specialistsRouter = Router();

specialistsRouter.post(
  '/specialists/profile',
  requireAuth,
  validate(createSpecialistProfileRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const profile = await createMySpecialistProfile(req.auth!.userId, req.body as CreateSpecialistProfileRequestInput);
      res.status(201).json({ message: 'Specialist profile created', data: profile });
    } catch (err) {
      next(err);
    }
  },
);

// Registered before `/specialists/:specialistId` so `me`/`public` are never captured as a `:specialistId` path param.
specialistsRouter.get('/specialists/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await getMySpecialistProfile(req.auth!.userId);
    res.status(200).json({ message: "Current user's specialist profile", data: profile });
  } catch (err) {
    next(err);
  }
});

specialistsRouter.patch(
  '/specialists/me',
  requireAuth,
  validate(updateSpecialistProfileRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const profile = await updateMySpecialistProfile(req.auth!.userId, req.body as UpdateSpecialistProfileRequestInput);
      res.status(200).json({ message: 'Specialist profile updated', data: profile });
    } catch (err) {
      next(err);
    }
  },
);

specialistsRouter.get('/specialists/me/status-history', requireAuth, async (req, res, next) => {
  try {
    const history = await getMySpecialistStatusHistory(req.auth!.userId);
    res.status(200).json({ message: "Current user's specialist profile status history", data: history });
  } catch (err) {
    next(err);
  }
});

specialistsRouter.get(
  '/specialists/public',
  validate(publicSpecialistsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery as unknown as PublicSpecialistsQueryInput;
      const { items, meta } = await getPublicSpecialists(query);
      res.status(200).json({ message: 'Published specialist profiles', data: items, meta });
    } catch (err) {
      next(err);
    }
  },
);

specialistsRouter.get(
  '/specialists/:specialistId',
  optionalAuth,
  validate(specialistIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { specialistId } = req.params as unknown as SpecialistIdParams;
      const profile = await getSpecialistById(specialistId, req.auth?.userId);
      res.status(200).json({ message: 'Specialist profile found', data: profile });
    } catch (err) {
      next(err);
    }
  },
);
