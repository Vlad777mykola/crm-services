import type { PoolClient } from 'pg';

export const CONSUMER_NAME = 'users-service';

/**
 * Idempotency ledger for this consumer: `(event_id, consumer_name)` as the
 * primary key - see docs/architecture/event-catalog.md ("Idempotency
 * requirement").
 */
export class ProcessedEventsRepository {
  /** Returns true the first time this eventId is seen, false if it was already processed. */
  async markProcessed(client: PoolClient, eventId: string): Promise<boolean> {
    const { rowCount } = await client.query(
      `INSERT INTO users_schema.processed_events ("event_id", "consumer_name") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [eventId, CONSUMER_NAME],
    );
    return rowCount === 1;
  }
}
