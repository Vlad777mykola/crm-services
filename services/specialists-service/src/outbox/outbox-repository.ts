import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

export type SpecialistDomainEventName = 'specialist.created' | 'specialist.updated';

export const specialistEventRouting: Record<SpecialistDomainEventName, { exchange: string; routingKey: string }> = {
  'specialist.created': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'specialist.created' },
  'specialist.updated': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'specialist.updated' },
};

export interface RecordOutboxEventInput {
  type: SpecialistDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
  correlationId?: string | null;
  causationId?: string | null;
}

export async function recordOutboxEvent(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
  const routing = specialistEventRouting[input.type];
  await manager.getRepository(OutboxEventEntity).insert({
    eventType: input.type,
    exchange: routing.exchange,
    routingKey: routing.routingKey,
    aggregateType: 'specialist_profile',
    aggregateId: input.aggregateId,
    payload: input.payload,
    correlationId: input.correlationId ?? null,
    causationId: input.causationId ?? null,
  });
}
