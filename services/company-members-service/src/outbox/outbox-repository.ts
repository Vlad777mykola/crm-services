import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

export type CompanyMemberDomainEventName = 'company-member.added' | 'company-member.removed';

export const companyMemberEventRouting: Record<CompanyMemberDomainEventName, { exchange: string; routingKey: string }> = {
  'company-member.added': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.added' },
  'company-member.removed': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.removed' },
};

export interface RecordOutboxEventInput {
  type: CompanyMemberDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
  correlationId?: string | null;
  causationId?: string | null;
}

export async function recordOutboxEvent(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
  const routing = companyMemberEventRouting[input.type];
  await manager.getRepository(OutboxEventEntity).insert({
    eventType: input.type,
    exchange: routing.exchange,
    routingKey: routing.routingKey,
    aggregateType: 'company_member',
    aggregateId: input.aggregateId,
    payload: input.payload,
    correlationId: input.correlationId ?? null,
    causationId: input.causationId ?? null,
  });
}
