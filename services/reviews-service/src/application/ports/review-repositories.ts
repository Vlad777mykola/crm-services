import type { EntityManager } from 'typeorm';

import type { CreateReviewInput, ReviewRow } from '../../db/review-repository.js';

export interface ReviewReadRepository {
  findByAppointmentId(appointmentId: string): Promise<ReviewRow | null>;
  listByCompany(companyId: string): Promise<ReviewRow[]>;
  listByService(serviceId: string): Promise<ReviewRow[]>;
  listBySpecialist(specialistProfileId: string): Promise<ReviewRow[]>;
}

export interface ReviewWriteRepository {
  create(manager: EntityManager, input: CreateReviewInput): Promise<ReviewRow>;
}
