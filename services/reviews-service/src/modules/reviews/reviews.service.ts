import type { DataSource } from 'typeorm';

import { findCompletedAppointmentForClient } from '../../db/legacy-appointments-bridge.js';
import { ReviewRepository, type ReviewRow } from '../../db/review-repository.js';
import { AppError } from '../../errors/AppError.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import type { CreateReviewInput } from './reviews.schemas.js';

export class ReviewsService {
  private readonly reviews: ReviewRepository;

  constructor(private readonly dataSource: DataSource) {
    this.reviews = new ReviewRepository(dataSource);
  }

  async create(appointmentId: string, clientUserId: string, input: CreateReviewInput): Promise<ReviewRow> {
    const appointment = await findCompletedAppointmentForClient(this.dataSource, appointmentId, clientUserId);
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

    return this.dataSource.transaction(async (manager) => {
      const review = await this.reviews.create(manager, {
        appointmentId,
        companyId: appointment.companyId,
        serviceId: appointment.serviceId,
        specialistProfileId: appointment.specialistProfileId,
        clientUserId,
        rating: input.rating,
        comment: input.comment ?? null,
      });

      await recordOutboxEvent(manager, {
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
