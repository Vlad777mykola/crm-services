import type { EntityManager } from 'typeorm';

import { recordOutboxEvent, type RecordOutboxEventInput } from '../../outbox/outbox-repository.js';
import type { CompanySpecialistEventOutbox } from '../ports/company-specialist-event-outbox.js';

export class TypeOrmCompanySpecialistEventOutbox implements CompanySpecialistEventOutbox {
  record(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
    return recordOutboxEvent(manager, input);
  }
}
