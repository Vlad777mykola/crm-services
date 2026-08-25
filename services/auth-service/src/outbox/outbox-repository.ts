import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

/**
 * Maps this service's own domain event types to the exchange/routing key
 * outbox-publisher should use - mirrors
 * backend/src/infrastructure/outbox/event-routing.ts, kept local because
 * services never import from `backend/src/modules/*` or from each other
 * (service-skeleton-standard.md).
 */
export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

export type AuthDomainEventName = 'auth.user_registered';

export const authEventRouting: Record<AuthDomainEventName, { exchange: string; routingKey: string }> = {
  'auth.user_registered': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'auth.user_registered' },
};

export interface RecordOutboxEventInput {
  type: AuthDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
  correlationId?: string | null;
  causationId?: string | null;
}

/**
 * Inserts an auth_schema.outbox_events row using the caller's transaction
 * manager, so the identity write and the outbox write commit or roll back
 * together - see auth.service.ts `register()`. Never talks to RabbitMQ
 * directly: services/outbox-publisher (redeployed per Q8, pointed at this
 * schema) is the only process that reads this table.
 */
export async function recordOutboxEvent(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
  const routing = authEventRouting[input.type];
  const repository = manager.getRepository(OutboxEventEntity);
  await repository.save(
    repository.create({
      eventType: input.type,
      exchange: routing.exchange,
      routingKey: routing.routingKey,
      aggregateType: 'auth_identity',
      aggregateId: input.aggregateId,
      payload: input.payload,
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
    }),
  );
}
