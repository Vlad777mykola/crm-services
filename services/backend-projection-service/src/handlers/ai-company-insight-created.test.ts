import { describe, expect, it, vi } from 'vitest';

import type { CompanyInsightRepository } from '../db/projections/company-insight-repository.js';
import { handleAiCompanyInsightCreated } from './ai-company-insight-created.js';

describe('handleAiCompanyInsightCreated', () => {
  it('maps the event payload onto an insight projection', async () => {
    const repository = { upsert: vi.fn() } as unknown as CompanyInsightRepository;

    await handleAiCompanyInsightCreated(
      {
        insightId: 'insight-1',
        companyId: 'company-1',
        insightType: 'churn_risk',
        summary: 'Booking cadence has dropped',
      },
      repository,
    );

    expect(repository.upsert).toHaveBeenCalledWith({
      id: 'insight-1',
      companyId: 'company-1',
      insightType: 'churn_risk',
      summary: 'Booking cadence has dropped',
    });
  });
});
