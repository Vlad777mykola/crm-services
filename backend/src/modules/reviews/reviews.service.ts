import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { eventBus } from '@/infrastructure/events/event-bus.js';
import { Appointment, AppointmentStatus } from '@/modules/appointments/appointment.entity.js';

import { Review } from './review.entity.js';
import type { CreateReviewInput } from './reviews.schemas.js';

function getReviewRepository(): Repository<Review> {
  return AppDataSource.getRepository(Review);
}

const REVIEW_RELATIONS = { client: true, service: true, specialist: true } as const;

export async function createReview(
  appointmentId: string,
  clientUserId: string,
  input: CreateReviewInput,
): Promise<Review> {
  const appointment = await AppDataSource.getRepository(Appointment).findOne({
    where: { id: appointmentId, clientUserId },
  });
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.status !== AppointmentStatus.COMPLETED) {
    throw new AppError('Only completed appointments can be reviewed', 409);
  }

  const repository = getReviewRepository();
  const existing = await repository.findOne({ where: { appointmentId } });
  if (existing) {
    throw new AppError('You have already reviewed this appointment', 409);
  }

  const review = await repository.save(
    repository.create({
      appointmentId,
      companyId: appointment.companyId,
      serviceId: appointment.serviceId,
      specialistProfileId: appointment.specialistProfileId,
      clientUserId,
      rating: input.rating,
      comment: input.comment ?? null,
    }),
  );

  const loaded = (await repository.findOne({ where: { id: review.id }, relations: REVIEW_RELATIONS }))!;

  await eventBus.publish('review.received', {
    reviewId: loaded.id,
    companyId: appointment.companyId,
    serviceId: appointment.serviceId,
    serviceName: loaded.service.name,
    rating: loaded.rating,
    comment: loaded.comment,
  });

  return loaded;
}

export async function listCompanyReviews(companyId: string): Promise<Review[]> {
  const repository = getReviewRepository();
  return repository.find({ where: { companyId }, relations: REVIEW_RELATIONS, order: { createdAt: 'DESC' } });
}

export async function listServiceReviews(serviceId: string): Promise<Review[]> {
  const repository = getReviewRepository();
  return repository.find({ where: { serviceId }, relations: REVIEW_RELATIONS, order: { createdAt: 'DESC' } });
}

export async function listSpecialistReviews(specialistProfileId: string): Promise<Review[]> {
  const repository = getReviewRepository();
  return repository.find({
    where: { specialistProfileId },
    relations: REVIEW_RELATIONS,
    order: { createdAt: 'DESC' },
  });
}
