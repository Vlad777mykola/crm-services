import type { EntityManager } from 'typeorm';

import { recordOutboxEvent, type RecordOutboxEventInput } from '../../outbox/outbox-repository.js';
import type { ReviewEventOutbox } from '../ports/review-event-outbox.js';

export class TypeOrmReviewEventOutbox implements ReviewEventOutbox {
  record(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
    return recordOutboxEvent(manager, input);
  }
}
