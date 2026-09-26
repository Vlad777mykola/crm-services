import type { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import type { CompanyInsightRepository } from '../db/company-insight-repository.js';
import type { CompanyRatingRepository } from '../db/company-rating-repository.js';
import type { ProcessedEventsRepository } from '../idempotency/processed-events-repository.js';
import { processInboundEvent } from './process-inbound-event.js';

function createDeps(isNewEvent = true) {
  const manager = {} as EntityManager;
  const dataSource = {
    transaction: vi.fn(async (callback: (entityManager: EntityManager) => Promise<void>) => callback(manager)),
  };
  const processedEvents = {
    markProcessed: vi.fn(async () => isNewEvent),
  } as unknown as ProcessedEventsRepository;
  const insights = {
    upsert: vi.fn(),
  } as unknown as CompanyInsightRepository;
  const ratings = {
    upsert: vi.fn(),
  } as unknown as CompanyRatingRepository;

  return { dataSource: dataSource as unknown as DataSource, manager, processedEvents, insights, ratings };
}

describe('processInboundEvent', () => {
  it('records company rating updates from analytics events', async () => {
    const deps = createDeps();

    await processInboundEvent(deps, {
      id: 'event-1',
      type: 'analytics.company_rating_updated',
      data: {
        companyId: 'company-1',
        averageRating: 4.8,
        reviewCount: 12,
      },
    });

    expect(deps.ratings.upsert).toHaveBeenCalledWith(deps.manager, {
      companyId: 'company-1',
      averageRating: 4.8,
      reviewsCount: 12,
    });
  });

  it('skips duplicate company rating events', async () => {
    const deps = createDeps(false);

    await processInboundEvent(deps, {
      id: 'event-1',
      type: 'analytics.company_rating_updated',
      data: {
        companyId: 'company-1',
        averageRating: 4.8,
        reviewCount: 12,
      },
    });

    expect(deps.ratings.upsert).not.toHaveBeenCalled();
  });
});
