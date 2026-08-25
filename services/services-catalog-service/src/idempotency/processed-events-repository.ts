import type { EntityManager } from 'typeorm';

import { ProcessedEventEntity } from '../db/entities/processed-event.entity.js';

const CONSUMER_NAME = 'services-catalog-service';

export class ProcessedEventsRepository {
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
