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

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | T | undefined;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body ? body.error?.message : undefined;
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return body as T;
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
