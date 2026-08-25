import type { EntityManager } from 'typeorm';

import type { EmailLogRepository } from '../../../db/email-log-repository.js';
import type { RecipientRepository } from '../../../db/recipient-repository.js';
import type { WireEventEnvelope } from '../../../wire-event.js';
import type { NotificationWriteRepository } from '../../ports/notification-repositories.js';
import { CreateNotificationsFromDomainEventService } from '../../services/create-notifications-from-domain-event.service.js';

export interface RecordDomainNotificationsDeps {
  recipients: RecipientRepository;
  notifications: NotificationWriteRepository;
  emailLogs: EmailLogRepository;
}

export class RecordDomainNotificationsHandler {
  private readonly service: CreateNotificationsFromDomainEventService;

  constructor(deps: RecordDomainNotificationsDeps) {
    this.service = new CreateNotificationsFromDomainEventService(deps);
  }

  handle(manager: EntityManager, event: WireEventEnvelope): Promise<void> {
    return this.service.execute({ manager, event });
  }
}
