import type { EntityManager } from 'typeorm';

import { recordOutboxEvent, type RecordOutboxEventInput } from '../../outbox/outbox-repository.js';
import type { SpecialistEventOutbox } from '../ports/specialist-event-outbox.js';

export class TypeOrmSpecialistEventOutbox implements SpecialistEventOutbox {
  record(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
    return recordOutboxEvent(manager, input);
  }
}
