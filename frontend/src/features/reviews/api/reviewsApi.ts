import { parseJsonOrThrow } from '@/shared/api/apiError';
import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/reviews/schemas.yaml.
export interface ReviewClientSummary {
  id: string;
  name: string;
}

export interface ReviewServiceSummary {
  id: string;
  name: string;
}

export interface ReviewSpecialistSummary {
  id: string;
  displayName: string;
}

export interface Review {
  id: string;
  appointmentId: string;
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  rating: number;
  comment: string | null;
  client?: ReviewClientSummary;
  service?: ReviewServiceSummary;
  specialist?: ReviewSpecialistSummary;
  createdAt: string;
}

export interface CreateReviewInput {
  rating: number;
  comment?: string | null;
}

export async function createReview(appointmentId: string, input: CreateReviewInput): Promise<Review> {
  const response = await authorizedFetch(`/appointments/${appointmentId}/review`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: Review }>(response);
  return body.data;
}

export async function fetchCompanyReviews(companyId: string): Promise<Review[]> {
  const response = await authorizedFetch(`/companies/${companyId}/reviews`);
  const body = await parseJsonOrThrow<{ data: Review[] }>(response);
  return body.data;
}

export async function fetchServiceReviews(serviceId: string): Promise<Review[]> {
  const response = await authorizedFetch(`/services/${serviceId}/reviews`);
  const body = await parseJsonOrThrow<{ data: Review[] }>(response);
  return body.data;
}

export async function fetchSpecialistReviews(specialistId: string): Promise<Review[]> {
  const response = await authorizedFetch(`/specialists/${specialistId}/reviews`);
  const body = await parseJsonOrThrow<{ data: Review[] }>(response);
  return body.data;
}
