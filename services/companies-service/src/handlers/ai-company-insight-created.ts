import type { CompanyInsightRepository } from '../db/company-insight-repository.js';

export interface AiCompanyInsightCreatedData {
  insightId: string;
  companyId: string;
  insightType: string;
  summary: string;
}

/** Mirrors contracts/events/ai.company_insight_created.v1.json. */
export async function handleAiCompanyInsightCreated(
  data: AiCompanyInsightCreatedData,
  repository: CompanyInsightRepository,
): Promise<void> {
  await repository.upsert({
    id: data.insightId,
    companyId: data.companyId,
    insightType: data.insightType,
    summary: data.summary,
  });
}
