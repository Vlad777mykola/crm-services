import type { Pool } from 'pg';

export interface AppointmentRecommendationProjection {
  id: string;
  appointmentId: string;
  companyId: string;
  summary: string;
  confidence: number;
}

/** Moved from backend-projection-service in Phase 12 - see README "Known gaps". */
export class AppointmentRecommendationRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(projection: AppointmentRecommendationProjection): Promise<void> {
    await this.pool.query(
      `INSERT INTO appointments_schema.appointment_recommendation_projections ("id", "appointmentId", "companyId", "summary", "confidence")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("id") DO NOTHING`,
      [projection.id, projection.appointmentId, projection.companyId, projection.summary, projection.confidence],
    );
  }
}
