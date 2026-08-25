import type { EntityManager } from 'typeorm';

import type { CompanyInsightRepository } from '../../../db/company-insight-repository.js';
import type { AiCompanyInsightCreatedData } from './record-ai-company-insight.event.js';

export class RecordAiCompanyInsightHandler {
  constructor(private readonly insights: CompanyInsightRepository) {}

  async handle(manager: EntityManager, data: AiCompanyInsightCreatedData): Promise<void> {
    await this.insights.upsert(manager, {
      id: data.insightId,
      companyId: data.companyId,
      insightType: data.insightType,
      summary: data.summary,
    });
  }
}
