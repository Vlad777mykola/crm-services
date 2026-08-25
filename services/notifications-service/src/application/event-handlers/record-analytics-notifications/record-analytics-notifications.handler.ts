import type { EntityManager } from 'typeorm';

import type { RecipientRepository } from '../../../db/recipient-repository.js';
import type { NotificationWriteRepository } from '../../ports/notification-repositories.js';
import { CreateNotificationsFromAnalyticsEventService } from '../../services/create-notifications-from-analytics-event.service.js';

export interface RecordAnalyticsNotificationsDeps {
  recipients: RecipientRepository;
  notifications: NotificationWriteRepository;
}

export class RecordAnalyticsNotificationsHandler {
  private readonly service: CreateNotificationsFromAnalyticsEventService;

  constructor(deps: RecordAnalyticsNotificationsDeps) {
    this.service = new CreateNotificationsFromAnalyticsEventService(deps);
  }

  handle(manager: EntityManager, envelope: { id: string; type: string; data: Record<string, unknown> }): Promise<void> {
    return this.service.execute({ manager, envelope });
  }
}
