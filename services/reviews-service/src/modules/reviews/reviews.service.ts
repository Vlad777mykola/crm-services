import type { DataSource } from 'typeorm';

import { CreateReviewHandler } from '../../application/commands/create-review/create-review.handler.js';
import { ListCompanyReviewsHandler } from '../../application/queries/list-company-reviews/list-company-reviews.handler.js';
import { ListServiceReviewsHandler } from '../../application/queries/list-service-reviews/list-service-reviews.handler.js';
import { ListSpecialistReviewsHandler } from '../../application/queries/list-specialist-reviews/list-specialist-reviews.handler.js';
import { TypeOrmAppointmentReviewLookup } from '../../application/services/typeorm-appointment-review-lookup.js';
import { TypeOrmReviewEventOutbox } from '../../application/services/typeorm-review-event-outbox.js';
import { ReviewRepository, type ReviewRow } from '../../db/review-repository.js';
import type { CreateReviewInput } from './reviews.schemas.js';

export class ReviewsService {
  private readonly createReviewCommand: CreateReviewHandler;
  private readonly listCompanyReviewsQuery: ListCompanyReviewsHandler;
  private readonly listServiceReviewsQuery: ListServiceReviewsHandler;
  private readonly listSpecialistReviewsQuery: ListSpecialistReviewsHandler;

  constructor(dataSource: DataSource) {
    const reviews = new ReviewRepository(dataSource);
    this.createReviewCommand = new CreateReviewHandler(
      dataSource,
      new TypeOrmAppointmentReviewLookup(dataSource),
      reviews,
      reviews,
      new TypeOrmReviewEventOutbox(),
    );
    this.listCompanyReviewsQuery = new ListCompanyReviewsHandler(reviews);
    this.listServiceReviewsQuery = new ListServiceReviewsHandler(reviews);
    this.listSpecialistReviewsQuery = new ListSpecialistReviewsHandler(reviews);
  }

  async create(appointmentId: string, clientUserId: string, input: CreateReviewInput): Promise<ReviewRow> {
    return this.createReviewCommand.execute({ appointmentId, clientUserId, input });
  }

  listForCompany(companyId: string): Promise<ReviewRow[]> {
    return this.listCompanyReviewsQuery.execute({ companyId });
  }

  listForService(serviceId: string): Promise<ReviewRow[]> {
    return this.listServiceReviewsQuery.execute({ serviceId });
  }

  listForSpecialist(specialistProfileId: string): Promise<ReviewRow[]> {
    return this.listSpecialistReviewsQuery.execute({ specialistProfileId });
  }
}
