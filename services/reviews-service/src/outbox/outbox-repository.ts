import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

// Reuses the existing v1 schema as-is (Task 10.4) - payload shape unchanged
// from when legacy-backend published this.
export type ReviewsDomainEventName = 'review.received';

export interface RecordOutboxEventInput {
  type: ReviewsDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
}

export async function recordOutboxEvent(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
  await manager.getRepository(OutboxEventEntity).insert({
    eventType: input.type,
    exchange: DOMAIN_EVENTS_EXCHANGE,
    routingKey: input.type,
    aggregateType: 'review',
    aggregateId: input.aggregateId,
    payload: input.payload,
  });
}
