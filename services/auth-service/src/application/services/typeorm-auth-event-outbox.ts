import type { EntityManager } from 'typeorm';

import { recordOutboxEvent, type RecordOutboxEventInput } from '../../outbox/outbox-repository.js';

export class TypeOrmAuthEventOutbox {
  record(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
    return recordOutboxEvent(manager, input);
  }
}
