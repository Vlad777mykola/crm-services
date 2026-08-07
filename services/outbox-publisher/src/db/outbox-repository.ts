import { Pool } from 'pg';

import { env } from '../env.js';

export interface OutboxRow {
  id: string;
  eventType: string;
  exchange: string;
  routingKey: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: Date;
}

/**
 * Plain `pg` access scoped to exactly one table and a fixed set of columns.
 * This service never imports TypeORM entities from backend/ and never
 * queries any table but outbox_events - see
 * docs/architecture/service-ownership.md ("outbox-publisher has limited
 * write access to outbox_events only").
 */
export class OutboxRepository {
  private readonly pool: Pool;

  constructor(databaseUrl: string = env.DATABASE_URL) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async findPending(limit: number): Promise<OutboxRow[]> {
    const { rows } = await this.pool.query<OutboxRow>(
      `SELECT "id", "eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload", "attempts", "createdAt"
       FROM "outbox_events"
       WHERE "status" = 'pending' AND "nextRetryAt" <= now()
       ORDER BY "createdAt" ASC
       LIMIT $1`,
      [limit],
    );
    return rows;
  }

  async markPublished(id: string): Promise<void> {
    await this.pool.query(`UPDATE "outbox_events" SET "status" = 'published', "publishedAt" = now() WHERE "id" = $1`, [
      id,
    ]);
  }

  async markFailedAttempt(id: string, attempts: number, nextRetryAt: Date, maxAttempts: number): Promise<void> {
    const status = attempts >= maxAttempts ? 'failed' : 'pending';
    await this.pool.query(
      `UPDATE "outbox_events" SET "attempts" = $2, "nextRetryAt" = $3, "status" = $4 WHERE "id" = $1`,
      [id, attempts, nextRetryAt, status],
    );
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
