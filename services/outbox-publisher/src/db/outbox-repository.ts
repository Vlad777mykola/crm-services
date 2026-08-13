import { Pool, type PoolClient } from 'pg';

import { env, outboxEventsTable } from '../env.js';
import { PUBLISHER_INSTANCE_ID } from './instance-id.js';

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
  correlationId?: string | null;
  causationId?: string | null;
}

const DEFAULT_LEASE_MS = 30_000;

/**
 * Plain `pg` access scoped to exactly one table and a fixed set of columns.
 */
export class OutboxRepository {
  private readonly pool: Pool;
  private readonly table: string;
  private leaseColumnsReady = false;

  constructor(databaseUrl: string = env.DATABASE_URL) {
    this.pool = new Pool({ connectionString: databaseUrl });
    this.table = outboxEventsTable();
  }

  async ensureLeaseColumns(): Promise<void> {
    if (this.leaseColumnsReady) {
      return;
    }
    await this.pool.query(`
      ALTER TABLE ${this.table}
        ADD COLUMN IF NOT EXISTS "lockedBy" varchar(200),
        ADD COLUMN IF NOT EXISTS "lockedAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "leaseUntil" timestamptz,
        ADD COLUMN IF NOT EXISTS "correlationId" uuid,
        ADD COLUMN IF NOT EXISTS "causationId" uuid
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbox_pending_claim"
      ON ${this.table} ("status", "nextRetryAt", "leaseUntil")
      WHERE "status" = 'pending'
    `);
    this.leaseColumnsReady = true;
  }

  async claimPending(
    limit: number,
    lockedBy: string = PUBLISHER_INSTANCE_ID,
    leaseMs: number = DEFAULT_LEASE_MS,
  ): Promise<OutboxRow[]> {
    await this.ensureLeaseColumns();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<OutboxRow>(
        `SELECT "id", "eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload", "attempts", "createdAt", "correlationId", "causationId"
         FROM ${this.table}
         WHERE "status" = 'pending'
           AND "nextRetryAt" <= now()
           AND ("leaseUntil" IS NULL OR "leaseUntil" <= now())
         ORDER BY "createdAt" ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [limit],
      );

      if (rows.length === 0) {
        await client.query('COMMIT');
        return [];
      }

      const ids = rows.map((row) => row.id);
      await client.query(
        `UPDATE ${this.table}
         SET "lockedBy" = $2, "lockedAt" = now(), "leaseUntil" = now() + ($3::text || ' milliseconds')::interval
         WHERE "id" = ANY($1::uuid[])`,
        [ids, lockedBy, String(leaseMs)],
      );
      await client.query('COMMIT');
      return rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markPublished(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE ${this.table}
       SET "status" = 'published', "publishedAt" = now(), "lockedBy" = NULL, "lockedAt" = NULL, "leaseUntil" = NULL
       WHERE "id" = $1`,
      [id],
    );
  }

  async markFailedAttempt(id: string, attempts: number, nextRetryAt: Date, maxAttempts: number): Promise<void> {
    const status = attempts >= maxAttempts ? 'failed' : 'pending';
    await this.pool.query(
      `UPDATE ${this.table}
       SET "attempts" = $2, "nextRetryAt" = $3, "status" = $4, "lockedBy" = NULL, "lockedAt" = NULL, "leaseUntil" = NULL
       WHERE "id" = $1`,
      [id, attempts, nextRetryAt, status],
    );
  }

  async releaseLease(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE ${this.table} SET "lockedBy" = NULL, "lockedAt" = NULL, "leaseUntil" = NULL WHERE "id" = $1`,
      [id],
    );
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async isOutboxTableReady(): Promise<boolean> {
    try {
      await this.pool.query(`SELECT 1 FROM ${this.table} LIMIT 0`);
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === '42P01') return false;
      throw err;
    }
  }

  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
