import type { PoolClient } from 'pg';

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
}

/**
 * Inserts a services_schema.outbox_events row using the caller's transaction
 * client, so the domain write and the outbox write commit or roll back
 * together.
 */
export async function recordOutboxEvent(client: PoolClient, input: RecordOutboxEventInput): Promise<void> {
  const routing = servicesEventRouting[input.type];
  const aggregateType = input.type.startsWith('specialist-service') ? 'service-specialist' : 'service';
  await client.query(
    `INSERT INTO services_schema.outbox_events
       ("eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.type, routing.exchange, routing.routingKey, aggregateType, input.aggregateId, input.payload],
  );
}
