import type { PoolClient } from 'pg';

const CONSUMER_NAME = 'auth-service';

export class ProcessedEventsRepository {
  async markProcessed(client: PoolClient, eventId: string): Promise<boolean> {
    const { rowCount } = await client.query(
      `INSERT INTO auth_schema.processed_events ("event_id", "consumer_name") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [eventId, CONSUMER_NAME],
    );
    return rowCount === 1;
  }
}
