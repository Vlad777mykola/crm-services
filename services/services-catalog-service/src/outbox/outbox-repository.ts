import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

export type ServicesDomainEventName =
  | 'service.created'
  | 'service.updated'
  | 'specialist-service.assigned'
  | 'specialist-service.removed';

export const servicesEventRouting: Record<ServicesDomainEventName, { exchange: string; routingKey: string }> = {
  'service.created': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'service.created' },
  'service.updated': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'service.updated' },
  'specialist-service.assigned': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'specialist-service.assigned' },
  'specialist-service.removed': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'specialist-service.removed' },
};

export interface RecordOutboxEventInput {
  type: ServicesDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
  correlationId?: string | null;
  causationId?: string | null;
}

/**
 * Inserts a services_schema.outbox_events row using the caller's transaction
 * manager, so the domain write and the outbox write commit or roll back
 * together.
 */
export async function recordOutboxEvent(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
  const routing = servicesEventRouting[input.type];
  const aggregateType = input.type.startsWith('specialist-service') ? 'service-specialist' : 'service';
  const repository = manager.getRepository(OutboxEventEntity);
  await repository.save(
    repository.create({
      eventType: input.type,
      exchange: routing.exchange,
      routingKey: routing.routingKey,
      aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
    }),
  );
}
