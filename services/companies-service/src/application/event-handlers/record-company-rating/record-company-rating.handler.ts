import type { EntityManager } from 'typeorm';

import type { CompanyRatingRepository } from '../../../db/company-rating-repository.js';
import type { CompanyRatingUpdatedData } from './record-company-rating.event.js';

export class RecordCompanyRatingHandler {
  constructor(private readonly ratings: CompanyRatingRepository) {}

  async handle(manager: EntityManager, data: CompanyRatingUpdatedData): Promise<void> {
    await this.ratings.upsert(manager, {
      companyId: data.companyId,
      averageRating: data.averageRating,
      reviewsCount: data.reviewCount,
    });
  }
}
