import type { PoolClient } from 'pg';

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
}

/**
 * Inserts a company_specialists_schema.outbox_events row using the caller's
 * transaction client, so the domain write and the outbox write commit or
 * roll back together.
 */
export async function recordOutboxEvent(client: PoolClient, input: RecordOutboxEventInput): Promise<void> {
  const routing = companySpecialistEventRouting[input.type];
  await client.query(
    `INSERT INTO company_specialists_schema.outbox_events
       ("eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.type, routing.exchange, routing.routingKey, 'company-specialist', input.aggregateId, input.payload],
  );
}
