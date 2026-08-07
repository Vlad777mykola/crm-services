import type { Pool } from 'pg';

export interface AppointmentRecommendationProjection {
  id: string;
  appointmentId: string;
  companyId: string;
  summary: string;
  confidence: number;
}

export class AppointmentRecommendationRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(projection: AppointmentRecommendationProjection): Promise<void> {
    await this.pool.query(
      `INSERT INTO "appointment_recommendation_projections" ("id", "appointmentId", "companyId", "summary", "confidence")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("id") DO NOTHING`,
      [projection.id, projection.appointmentId, projection.companyId, projection.summary, projection.confidence],
    );
  }
}
