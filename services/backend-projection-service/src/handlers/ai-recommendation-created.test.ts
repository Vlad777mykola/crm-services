import { describe, expect, it, vi } from 'vitest';

import type { AppointmentRecommendationRepository } from '../db/projections/appointment-recommendation-repository.js';
import { handleAiRecommendationCreated } from './ai-recommendation-created.js';

describe('handleAiRecommendationCreated', () => {
  it('maps the event payload onto a recommendation projection', async () => {
    const repository = { upsert: vi.fn() } as unknown as AppointmentRecommendationRepository;

    await handleAiRecommendationCreated(
      {
        recommendationId: 'rec-1',
        appointmentId: 'appt-1',
        companyId: 'company-1',
        summary: 'Likely to be rescheduled',
        confidence: 0.82,
      },
      repository,
    );

    expect(repository.upsert).toHaveBeenCalledWith({
      id: 'rec-1',
      appointmentId: 'appt-1',
      companyId: 'company-1',
      summary: 'Likely to be rescheduled',
      confidence: 0.82,
    });
  });
});
