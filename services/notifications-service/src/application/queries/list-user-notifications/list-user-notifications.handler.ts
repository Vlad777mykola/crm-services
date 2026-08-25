import type { NotificationRow } from '../../../db/entities/notification.entity.js';
import type { NotificationReadRepository } from '../../ports/notification-repositories.js';
import type { ListUserNotificationsQuery } from './list-user-notifications.query.js';

export class ListUserNotificationsHandler {
  constructor(private readonly reads: NotificationReadRepository) {}

  execute(query: ListUserNotificationsQuery): Promise<NotificationRow[]> {
    return this.reads.listForUser(query.userId);
  }
}
