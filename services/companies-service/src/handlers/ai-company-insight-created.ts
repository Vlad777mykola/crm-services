import type { PoolClient } from 'pg';

import type { CompanyInsightRepository } from '../db/company-insight-repository.js';

export interface AiCompanyInsightCreatedData {
  insightId: string;
  companyId: string;
  insightType: string;
  summary: string;
}

export async function handleAiCompanyInsightCreated(
  client: PoolClient,
  data: AiCompanyInsightCreatedData,
  repository: CompanyInsightRepository,
): Promise<void> {
  await repository.upsert(client, {
    id: data.insightId,
    companyId: data.companyId,
    insightType: data.insightType,
    summary: data.summary,
  });
}
