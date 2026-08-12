import { Router } from 'express';

import type { ReviewsService } from '../../modules/reviews/reviews.service.js';
import {
  appointmentOnlyIdParamsSchema,
  companyIdParamsSchema,
  createReviewRequestSchema,
  serviceOnlyIdParamsSchema,
  specialistIdParamsSchema,
  type AppointmentOnlyIdParams,
  type CompanyIdParams,
  type CreateReviewInput,
  type ServiceOnlyIdParams,
  type SpecialistIdParams,
} from '../../modules/reviews/reviews.schemas.js';
import { requireAuth } from '../require-auth.js';
import { validate } from '../validate.js';

export function createReviewsRouter(reviewsService: ReviewsService): Router {
  const router = Router();

  router.post(
    '/appointments/:appointmentId/review',
    requireAuth,
    validate(appointmentOnlyIdParamsSchema, 'params'),
    validate(createReviewRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { appointmentId } = req.params as unknown as AppointmentOnlyIdParams;
        const review = await reviewsService.create(appointmentId, req.auth!.userId, req.body as CreateReviewInput);
        res.status(201).json({ message: 'Review created', data: review });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/companies/:companyId/reviews',
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const reviews = await reviewsService.listForCompany(companyId);
        res.status(200).json({ message: 'Company reviews', data: reviews });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/services/:serviceId/reviews',
    validate(serviceOnlyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { serviceId } = req.params as unknown as ServiceOnlyIdParams;
        const reviews = await reviewsService.listForService(serviceId);
        res.status(200).json({ message: 'Service reviews', data: reviews });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/specialists/:specialistId/reviews',
    validate(specialistIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { specialistId } = req.params as unknown as SpecialistIdParams;
        const reviews = await reviewsService.listForSpecialist(specialistId);
        res.status(200).json({ message: 'Specialist reviews', data: reviews });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
