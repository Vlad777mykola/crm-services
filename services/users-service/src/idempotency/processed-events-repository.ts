import type { EntityManager } from 'typeorm';

import { ProcessedEventEntity } from '../db/entities/processed-event.entity.js';

export const CONSUMER_NAME = 'users-service';

/**
 * Idempotency ledger for this consumer: `(event_id, consumer_name)` as the
 * primary key - see docs/architecture/event-catalog.md ("Idempotency
 * requirement").
 */
export class ProcessedEventsRepository {
  /** Returns true the first time this eventId is seen, false if it was already processed. */
  async markProcessed(manager: EntityManager, eventId: string): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(ProcessedEventEntity)
      .values({ eventId, consumerName: CONSUMER_NAME })
      .orIgnore()
      .returning('"event_id"')
      .execute();
    return result.raw.length === 1;
  }
}
