import type { PoolClient } from 'pg';

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
}

/**
 * Inserts a companies_schema.outbox_events row using the caller's transaction
 * client, so the company write and the outbox write commit or roll back
 * together - mirrors services/auth-service/src/outbox/outbox-repository.ts.
 */
export async function recordOutboxEvent(client: PoolClient, input: RecordOutboxEventInput): Promise<void> {
  const routing = companyEventRouting[input.type];
  await client.query(
    `INSERT INTO companies_schema.outbox_events
       ("eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.type, routing.exchange, routing.routingKey, 'company', input.aggregateId, input.payload],
  );
}
