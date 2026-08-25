import type { ReviewRow } from '../../../db/review-repository.js';
import type { ReviewReadRepository } from '../../ports/review-repositories.js';
import type { ListServiceReviewsQuery } from './list-service-reviews.query.js';

export class ListServiceReviewsHandler {
  constructor(private readonly reads: ReviewReadRepository) {}

  execute(query: ListServiceReviewsQuery): Promise<ReviewRow[]> {
    return this.reads.listByService(query.serviceId);
  }
}
