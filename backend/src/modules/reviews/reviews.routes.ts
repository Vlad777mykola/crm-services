import { Router } from 'express';

import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';
import { appointmentOnlyIdParamsSchema, type AppointmentOnlyIdParams } from '@/modules/appointments/appointments.schemas.js';
import { companyIdParamsSchema, type CompanyIdParams } from '@/modules/companies/companies.schemas.js';
import { serviceOnlyIdParamsSchema, type ServiceOnlyIdParams } from '@/modules/services/services.schemas.js';
import { specialistIdParamsSchema, type SpecialistIdParams } from '@/modules/specialists/specialists.schemas.js';

import { createReviewRequestSchema, type CreateReviewInput } from './reviews.schemas.js';
import { createReview, listCompanyReviews, listServiceReviews, listSpecialistReviews } from './reviews.service.js';

export const reviewsRouter = Router();

reviewsRouter.post(
  '/appointments/:appointmentId/review',
  requireAuth,
  validate(appointmentOnlyIdParamsSchema, 'params'),
  validate(createReviewRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { appointmentId } = req.params as unknown as AppointmentOnlyIdParams;
      const review = await createReview(appointmentId, req.auth!.userId, req.body as CreateReviewInput);
      res.status(201).json({ message: 'Review created', data: review });
    } catch (err) {
      next(err);
    }
  },
);

reviewsRouter.get(
  '/companies/:companyId/reviews',
  validate(companyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const reviews = await listCompanyReviews(companyId);
      res.status(200).json({ message: 'Company reviews', data: reviews });
    } catch (err) {
      next(err);
    }
  },
);

reviewsRouter.get(
  '/services/:serviceId/reviews',
  validate(serviceOnlyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { serviceId } = req.params as unknown as ServiceOnlyIdParams;
      const reviews = await listServiceReviews(serviceId);
      res.status(200).json({ message: 'Service reviews', data: reviews });
    } catch (err) {
      next(err);
    }
  },
);

reviewsRouter.get(
  '/specialists/:specialistId/reviews',
  validate(specialistIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { specialistId } = req.params as unknown as SpecialistIdParams;
      const reviews = await listSpecialistReviews(specialistId);
      res.status(200).json({ message: 'Specialist reviews', data: reviews });
    } catch (err) {
      next(err);
    }
  },
);
