import type { DataSource, EntityManager } from 'typeorm';

import { ReviewEntity, type ReviewRow } from './entities/review.entity.js';

export type { ReviewRow } from './entities/review.entity.js';

export interface CreateReviewInput {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  rating: number;
  comment: string | null;
}

export class ReviewRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByAppointmentId(appointmentId: string): Promise<ReviewRow | null> {
    return this.dataSource.getRepository(ReviewEntity).findOne({ where: { appointmentId } });
  }

  async create(manager: EntityManager, input: CreateReviewInput): Promise<ReviewRow> {
    const repository = manager.getRepository(ReviewEntity);
    return repository.save(repository.create(input));
  }

  async listByCompany(companyId: string): Promise<ReviewRow[]> {
    return this.dataSource.getRepository(ReviewEntity).find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async listByService(serviceId: string): Promise<ReviewRow[]> {
    return this.dataSource.getRepository(ReviewEntity).find({
      where: { serviceId },
      order: { createdAt: 'DESC' },
    });
  }

  async listBySpecialist(specialistProfileId: string): Promise<ReviewRow[]> {
    return this.dataSource.getRepository(ReviewEntity).find({
      where: { specialistProfileId },
      order: { createdAt: 'DESC' },
    });
  }
}
