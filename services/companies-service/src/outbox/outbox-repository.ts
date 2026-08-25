import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

export type CompanyDomainEventName = 'company.created' | 'company.updated';

export const companyEventRouting: Record<CompanyDomainEventName, { exchange: string; routingKey: string }> = {
  'company.created': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company.created' },
  'company.updated': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company.updated' },
};

export interface RecordOutboxEventInput {
  type: CompanyDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
  correlationId?: string | null;
  causationId?: string | null;
}

/**
 * Inserts a companies_schema.outbox_events row using the caller's transaction
 * client, so the company write and the outbox write commit or roll back
 * together - mirrors services/auth-service/src/outbox/outbox-repository.ts.
 */
export async function recordOutboxEvent(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
  const routing = companyEventRouting[input.type];
  await manager.getRepository(OutboxEventEntity).insert({
    eventType: input.type,
    exchange: routing.exchange,
    routingKey: routing.routingKey,
    aggregateType: 'company',
    aggregateId: input.aggregateId,
    payload: input.payload,
    correlationId: input.correlationId ?? null,
    causationId: input.causationId ?? null,
  });
}
