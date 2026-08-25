import type { NotificationReadRepository } from '../../ports/notification-repositories.js';
import type { CountUnreadNotificationsQuery } from './count-unread-notifications.query.js';

export class CountUnreadNotificationsHandler {
  constructor(private readonly reads: NotificationReadRepository) {}

  execute(query: CountUnreadNotificationsQuery): Promise<number> {
    return this.reads.countUnread(query.userId);
  }
}
