import type { PoolClient } from 'pg';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

// Reuses the existing v1 schema as-is (Task 10.4) - payload shape unchanged
// from when legacy-backend published this.
export type ReviewsDomainEventName = 'review.received';

export interface RecordOutboxEventInput {
  type: ReviewsDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
}

export async function recordOutboxEvent(client: PoolClient, input: RecordOutboxEventInput): Promise<void> {
  await client.query(
    `INSERT INTO reviews_schema.outbox_events
       ("eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.type, DOMAIN_EVENTS_EXCHANGE, input.type, 'review', input.aggregateId, input.payload],
  );
}
