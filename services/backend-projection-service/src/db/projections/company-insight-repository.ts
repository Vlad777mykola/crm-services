import type { Pool } from 'pg';

export interface CompanyInsightProjection {
  id: string;
  companyId: string;
  insightType: string;
  summary: string;
}

export class CompanyInsightRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(projection: CompanyInsightProjection): Promise<void> {
    await this.pool.query(
      `INSERT INTO "company_insight_projections" ("id", "companyId", "insightType", "summary")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("id") DO NOTHING`,
      [projection.id, projection.companyId, projection.insightType, projection.summary],
    );
  }
}
