import type { PoolClient } from 'pg';

export interface CompanyInsightProjection {
  id: string;
  companyId: string;
  insightType: string;
  summary: string;
}

export class CompanyInsightRepository {
  async upsert(client: PoolClient, projection: CompanyInsightProjection): Promise<void> {
    await client.query(
      `INSERT INTO companies_schema.company_insight_projections ("id", "companyId", "insightType", "summary")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("id") DO NOTHING`,
      [projection.id, projection.companyId, projection.insightType, projection.summary],
    );
  }
}
