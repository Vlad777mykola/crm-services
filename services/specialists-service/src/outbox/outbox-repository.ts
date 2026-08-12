import type { PoolClient } from 'pg';

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
}

export async function recordOutboxEvent(client: PoolClient, input: RecordOutboxEventInput): Promise<void> {
  const routing = specialistEventRouting[input.type];
  await client.query(
    `INSERT INTO specialists_schema.outbox_events
       ("eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.type, routing.exchange, routing.routingKey, 'specialist_profile', input.aggregateId, input.payload],
  );
}
