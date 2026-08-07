import type { Pool } from 'pg';

const CONSUMER_NAME = 'notifications-service';

/**
 * Idempotency ledger for this consumer: `(event_id, consumer_name)` as the
 * primary key lets multiple consumer services safely share one physical
 * `processed_events` table in the main database without colliding - see
 * docs/architecture/event-driven-model.md ("idempotent consumers").
 */
export class ProcessedEventsRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "processed_events" (
        "event_id" uuid NOT NULL,
        "consumer_name" varchar(100) NOT NULL,
        "processed_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("event_id", "consumer_name")
      )
    `);
  }

  /** Returns true the first time this eventId is seen, false if it was already processed. */
  async markProcessed(eventId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `INSERT INTO "processed_events" ("event_id", "consumer_name") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [eventId, CONSUMER_NAME],
    );
    return rowCount === 1;
  }
}
