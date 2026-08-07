import type { AppointmentRecommendationRepository } from '../db/projections/appointment-recommendation-repository.js';

export interface AiRecommendationCreatedData {
  recommendationId: string;
  appointmentId: string;
  companyId: string;
  summary: string;
  confidence: number;
}

/** Mirrors contracts/events/ai.appointment_recommendation_created.v1.json. */
export async function handleAiRecommendationCreated(
  data: AiRecommendationCreatedData,
  repository: AppointmentRecommendationRepository,
): Promise<void> {
  await repository.upsert({
    id: data.recommendationId,
    appointmentId: data.appointmentId,
    companyId: data.companyId,
    summary: data.summary,
    confidence: data.confidence,
  });
}
