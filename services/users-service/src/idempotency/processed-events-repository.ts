import type { Pool } from 'pg';

const CONSUMER_NAME = 'users-service';

/**
 * Idempotency ledger for this consumer: `(event_id, consumer_name)` as the
 * primary key - see docs/architecture/event-catalog.md ("Idempotency
 * requirement").
 */
export class ProcessedEventsRepository {
  constructor(private readonly pool: Pool) {}

  /** Returns true the first time this eventId is seen, false if it was already processed. */
  async markProcessed(eventId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `INSERT INTO users_schema.processed_events ("event_id", "consumer_name") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [eventId, CONSUMER_NAME],
    );
    return rowCount === 1;
  }
}
