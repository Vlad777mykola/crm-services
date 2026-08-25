import type { EntityManager } from 'typeorm';

import type { RecordOutboxEventInput } from '../../outbox/outbox-repository.js';

export interface CompanySpecialistEventOutbox {
  record(manager: EntityManager, input: RecordOutboxEventInput): Promise<void>;
}
