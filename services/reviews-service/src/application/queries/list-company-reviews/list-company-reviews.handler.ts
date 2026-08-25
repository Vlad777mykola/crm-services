import type { ReviewRow } from '../../../db/review-repository.js';
import type { ReviewReadRepository } from '../../ports/review-repositories.js';
import type { ListCompanyReviewsQuery } from './list-company-reviews.query.js';

export class ListCompanyReviewsHandler {
  constructor(private readonly reads: ReviewReadRepository) {}

  execute(query: ListCompanyReviewsQuery): Promise<ReviewRow[]> {
    return this.reads.listByCompany(query.companyId);
  }
}
