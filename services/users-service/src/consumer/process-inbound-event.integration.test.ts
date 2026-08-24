import { randomUUID } from 'node:crypto';

import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { processInboundEvent } from './process-inbound-event.js';
import { createDataSource } from '../db/data-source.js';
import { ensureUsersSchema } from '../db/schema.js';
import { UserRepository } from '../db/user-repository.js';
import { CONSUMER_NAME, ProcessedEventsRepository } from '../idempotency/processed-events-repository.js';

const hasDatabase = process.env.USERS_INTEGRATION_TEST === '1';

async function countProcessedEvents(dataSource: DataSource, eventId: string): Promise<number> {
  const rows = await dataSource.query<Array<{ count: string }>>(
    `SELECT count(*)::text AS count FROM users_schema.processed_events WHERE "event_id" = $1 AND "consumer_name" = $2`,
    [eventId, CONSUMER_NAME],
  );
  return Number(rows[0]?.count ?? 0);
}

async function profileExists(dataSource: DataSource, userId: string): Promise<boolean> {
  const rows = await dataSource.query<Array<{ count: string }>>(
    `SELECT count(*)::text AS count
     FROM users_schema.users u
     JOIN users_schema.user_profiles p ON p."userId" = u."id"
     WHERE u."id" = $1`,
    [userId],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

describe.skipIf(!hasDatabase)('processInboundEvent integration', () => {
  let dataSource: DataSource;
  const processedEvents = new ProcessedEventsRepository();
  let users: UserRepository;

  beforeAll(async () => {
    dataSource = createDataSource();
    await dataSource.initialize();
    await ensureUsersSchema(dataSource);
    users = new UserRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM users_schema.user_profiles');
    await dataSource.query('DELETE FROM users_schema.users');
    await dataSource.query('DELETE FROM users_schema.processed_events');
  });

  it('happy path: processed_events and profile created', async () => {
    const eventId = randomUUID();
    const userId = randomUUID();

    await processInboundEvent(
      { dataSource, processedEvents, users },
      {
        id: eventId,
        type: 'auth.user_registered',
        data: { userId, email: 'alice@example.com', name: 'Alice' },
      },
    );

    expect(await countProcessedEvents(dataSource, eventId)).toBe(1);
    expect(await profileExists(dataSource, userId)).toBe(true);
  });

  it('handler failure rolls back processed_events and profile', async () => {
    const eventId = randomUUID();
    const userId = randomUUID();
    const envelope = {
      id: eventId,
      type: 'auth.user_registered',
      data: { userId, email: 'bob@example.com', name: 'Bob' },
    };

    await expect(
      processInboundEvent(
        {
          dataSource,
          processedEvents,
          users,
          afterMarkProcessed: () => {
            throw new Error('simulated handler failure');
          },
        },
        envelope,
      ),
    ).rejects.toThrow('simulated handler failure');

    expect(await countProcessedEvents(dataSource, eventId)).toBe(0);
    expect(await profileExists(dataSource, userId)).toBe(false);

    await processInboundEvent({ dataSource, processedEvents, users }, envelope);

    expect(await countProcessedEvents(dataSource, eventId)).toBe(1);
    expect(await profileExists(dataSource, userId)).toBe(true);
  });

  it('duplicate after success is skipped without duplicate profile', async () => {
    const eventId = randomUUID();
    const userId = randomUUID();
    const envelope = {
      id: eventId,
      type: 'auth.user_registered',
      data: { userId, email: 'carol@example.com', name: 'Carol' },
    };

    await processInboundEvent({ dataSource, processedEvents, users }, envelope);
    await processInboundEvent({ dataSource, processedEvents, users }, envelope);

    expect(await countProcessedEvents(dataSource, eventId)).toBe(1);
    expect(await profileExists(dataSource, userId)).toBe(true);

    const rows = await dataSource.query<Array<{ count: string }>>(`SELECT count(*)::text AS count FROM users_schema.users WHERE "id" = $1`, [
      userId,
    ]);
    expect(Number(rows[0]?.count)).toBe(1);
  });
});
