import type { EntityManager } from 'typeorm';

import type { RecordOutboxEventInput } from '../../outbox/outbox-repository.js';

export interface SpecialistEventOutbox {
  record(manager: EntityManager, input: RecordOutboxEventInput): Promise<void>;
}
