import type { Pool } from 'pg';

import { findCompletedAppointmentForClient } from '../../db/legacy-appointments-bridge.js';
import { ReviewRepository, type ReviewRow } from '../../db/review-repository.js';
import { AppError } from '../../errors/AppError.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import type { CreateReviewInput } from './reviews.schemas.js';

export class ReviewsService {
  private readonly reviews: ReviewRepository;

  constructor(private readonly pool: Pool) {
    this.reviews = new ReviewRepository(pool);
  }

  async create(appointmentId: string, clientUserId: string, input: CreateReviewInput): Promise<ReviewRow> {
    const appointment = await findCompletedAppointmentForClient(this.pool, appointmentId, clientUserId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
    if (appointment.status !== 'completed') {
      throw new AppError('Only completed appointments can be reviewed', 409);
    }

    const existing = await this.reviews.findByAppointmentId(appointmentId);
    if (existing) {
      throw new AppError('You have already reviewed this appointment', 409);
    }

    return this.reviews.withTransaction(async (client) => {
      const review = await this.reviews.create(client, {
        appointmentId,
        companyId: appointment.companyId,
        serviceId: appointment.serviceId,
        specialistProfileId: appointment.specialistProfileId,
        clientUserId,
        rating: input.rating,
        comment: input.comment ?? null,
      });

      await recordOutboxEvent(client, {
        type: 'review.received',
        aggregateId: review.id,
        payload: {
          reviewId: review.id,
          companyId: review.companyId,
          serviceId: review.serviceId,
          serviceName: appointment.serviceName ?? 'Unknown service',
          rating: review.rating,
          comment: review.comment,
        },
      });

      return review;
    });
  }

  listForCompany(companyId: string): Promise<ReviewRow[]> {
    return this.reviews.listByCompany(companyId);
  }

  listForService(serviceId: string): Promise<ReviewRow[]> {
    return this.reviews.listByService(serviceId);
  }

  listForSpecialist(specialistProfileId: string): Promise<ReviewRow[]> {
    return this.reviews.listBySpecialist(specialistProfileId);
  }
}
