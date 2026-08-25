import type { DataSource } from 'typeorm';

import type { ReviewRow } from '../../../db/review-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { AppointmentReviewLookup } from '../../ports/appointment-review-lookup.js';
import type { ReviewEventOutbox } from '../../ports/review-event-outbox.js';
import type { ReviewReadRepository, ReviewWriteRepository } from '../../ports/review-repositories.js';
import type { CreateReviewCommand } from './create-review.command.js';

export class CreateReviewHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appointments: AppointmentReviewLookup,
    private readonly reads: ReviewReadRepository,
    private readonly writes: ReviewWriteRepository,
    private readonly outbox: ReviewEventOutbox,
  ) {}

  async execute(command: CreateReviewCommand): Promise<ReviewRow> {
    const appointment = await this.appointments.findCompletedAppointmentForClient(
      command.appointmentId,
      command.clientUserId,
    );
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
    if (appointment.status !== 'completed') {
      throw new AppError('Only completed appointments can be reviewed', 409);
    }

    const existing = await this.reads.findByAppointmentId(command.appointmentId);
    if (existing) {
      throw new AppError('You have already reviewed this appointment', 409);
    }

    return this.dataSource.transaction(async (manager) => {
      const review = await this.writes.create(manager, {
        appointmentId: command.appointmentId,
        companyId: appointment.companyId,
        serviceId: appointment.serviceId,
        specialistProfileId: appointment.specialistProfileId,
        clientUserId: command.clientUserId,
        rating: command.input.rating,
        comment: command.input.comment ?? null,
      });

      await this.outbox.record(manager, {
        type: 'review.received',
        aggregateId: review.id,
        payload: {
          reviewId: review.id,
          companyId: review.companyId,
          serviceId: review.serviceId,
          specialistProfileId: review.specialistProfileId,
          serviceName: appointment.serviceName ?? 'Unknown service',
          rating: review.rating,
          comment: review.comment,
        },
      });

      return review;
    });
  }
}
