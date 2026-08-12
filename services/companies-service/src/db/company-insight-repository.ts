import type { Pool } from 'pg';

export interface CompanyInsightProjection {
  id: string;
  companyId: string;
  insightType: string;
  summary: string;
}

/** Moved from backend-projection-service in Phase 12 - see README "Known gaps". */
export class CompanyInsightRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(projection: CompanyInsightProjection): Promise<void> {
    await this.pool.query(
      `INSERT INTO companies_schema.company_insight_projections ("id", "companyId", "insightType", "summary")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("id") DO NOTHING`,
      [projection.id, projection.companyId, projection.insightType, projection.summary],
    );
  }
}
