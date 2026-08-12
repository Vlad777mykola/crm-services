import type { Pool } from 'pg';

const CONSUMER_NAME = 'companies-service';

export class ProcessedEventsRepository {
  constructor(private readonly pool: Pool) {}

  async markProcessed(eventId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `INSERT INTO companies_schema.processed_events ("event_id", "consumer_name") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [eventId, CONSUMER_NAME],
    );
    return rowCount === 1;
  }
}
