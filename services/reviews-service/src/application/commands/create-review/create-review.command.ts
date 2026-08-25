import type { CreateReviewInput } from '../../../modules/reviews/reviews.schemas.js';

export interface CreateReviewCommand {
  appointmentId: string;
  clientUserId: string;
  input: CreateReviewInput;
  correlationId?: string;
}
