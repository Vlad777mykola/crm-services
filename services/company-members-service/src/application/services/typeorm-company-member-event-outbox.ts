import type { EntityManager } from 'typeorm';

import { recordOutboxEvent, type RecordOutboxEventInput } from '../../outbox/outbox-repository.js';
import type { CompanyMemberEventOutbox } from '../ports/company-member-event-outbox.js';

export class TypeOrmCompanyMemberEventOutbox implements CompanyMemberEventOutbox {
  record(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
    return recordOutboxEvent(manager, input);
  }
}
