import type { EntityManager } from 'typeorm';

import type { DomainEventMap, DomainEventName } from '@/infrastructure/events/domain-events.js';

import { domainEventRouting } from './event-routing.js';
import { OutboxEvent, OutboxEventStatus } from './outbox-event.entity.js';

export interface RecordOutboxEventInput<Name extends DomainEventName> {
  type: Name;
  payload: DomainEventMap[Name];
  aggregateType: string;
  aggregateId: string;
}

/**
 * Inserts an outbox_events row using the caller's EntityManager - pass the
 * manager from the same `AppDataSource.transaction(...)` call that performs
 * the business write, so both commit or roll back together. Never talks to
 * RabbitMQ directly: services/outbox-publisher is the only process that
 * reads this table and reaches the broker (see docs/architecture/event-driven-model.md).
 */
export async function recordOutboxEvent<Name extends DomainEventName>(
  manager: EntityManager,
  input: RecordOutboxEventInput<Name>,
): Promise<OutboxEvent> {
  const routing = domainEventRouting[input.type];
  const repository = manager.getRepository(OutboxEvent);
  return repository.save(
    repository.create({
      eventType: input.type,
      exchange: routing.exchange,
      routingKey: routing.routingKey,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload as unknown as Record<string, unknown>,
      status: OutboxEventStatus.PENDING,
      attempts: 0,
      nextRetryAt: new Date(),
      publishedAt: null,
    }),
  );
}
