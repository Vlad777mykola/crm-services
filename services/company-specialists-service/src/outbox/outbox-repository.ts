import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

// `company-specialist.removed` has a contract (contracts/events/company-specialist.removed.v1.json)
// but is NOT published here - legacy has no code path that removes a relation
// (no removal endpoint exists), so there is nothing to trigger it yet.
export type CompanySpecialistDomainEventName = 'company-specialist.accepted';

export const companySpecialistEventRouting: Record<
  CompanySpecialistDomainEventName,
  { exchange: string; routingKey: string }
> = {
  'company-specialist.accepted': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-specialist.accepted' },
};

export interface RecordOutboxEventInput {
  type: CompanySpecialistDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
  correlationId?: string | null;
  causationId?: string | null;
}

/**
 * Inserts a company_specialists_schema.outbox_events row using the caller's
 * transaction client, so the domain write and the outbox write commit or
 * roll back together.
 */
export async function recordOutboxEvent(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
  const routing = companySpecialistEventRouting[input.type];
  await manager.getRepository(OutboxEventEntity).insert({
    eventType: input.type,
    exchange: routing.exchange,
    routingKey: routing.routingKey,
    aggregateType: 'company-specialist',
    aggregateId: input.aggregateId,
    payload: input.payload,
    correlationId: input.correlationId ?? null,
    causationId: input.causationId ?? null,
  });
}
