import type { ReviewRow } from '../../../db/review-repository.js';
import type { ReviewReadRepository } from '../../ports/review-repositories.js';
import type { ListSpecialistReviewsQuery } from './list-specialist-reviews.query.js';

export class ListSpecialistReviewsHandler {
  constructor(private readonly reads: ReviewReadRepository) {}

  execute(query: ListSpecialistReviewsQuery): Promise<ReviewRow[]> {
    return this.reads.listBySpecialist(query.specialistProfileId);
  }
}
