import type { PoolClient } from 'pg';

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
}

export async function recordOutboxEvent(client: PoolClient, input: RecordOutboxEventInput): Promise<void> {
  const routing = companyMemberEventRouting[input.type];
  await client.query(
    `INSERT INTO company_members_schema.outbox_events
       ("eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.type, routing.exchange, routing.routingKey, 'company_member', input.aggregateId, input.payload],
  );
}
