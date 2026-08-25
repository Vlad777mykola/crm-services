import { MarkAllNotificationsReadHandler } from '../../application/commands/mark-all-notifications-read/mark-all-notifications-read.handler.js';
import { MarkNotificationReadHandler } from '../../application/commands/mark-notification-read/mark-notification-read.handler.js';
import type {
  NotificationReadRepository,
  NotificationWriteRepository,
} from '../../application/ports/notification-repositories.js';
import { CountUnreadNotificationsHandler } from '../../application/queries/count-unread-notifications/count-unread-notifications.handler.js';
import { ListUserNotificationsHandler } from '../../application/queries/list-user-notifications/list-user-notifications.handler.js';
import type { NotificationRow } from '../../db/notification-repository.js';

export class NotificationsHttpService {
  private readonly countUnreadQuery: CountUnreadNotificationsHandler;
  private readonly listQuery: ListUserNotificationsHandler;
  private readonly markAllReadCommand: MarkAllNotificationsReadHandler;
  private readonly markReadCommand: MarkNotificationReadHandler;

  constructor(reads: NotificationReadRepository, writes: NotificationWriteRepository) {
    this.countUnreadQuery = new CountUnreadNotificationsHandler(reads);
    this.listQuery = new ListUserNotificationsHandler(reads);
    this.markAllReadCommand = new MarkAllNotificationsReadHandler(reads, writes);
    this.markReadCommand = new MarkNotificationReadHandler(reads, writes);
  }

  listForUser(userId: string): Promise<NotificationRow[]> {
    return this.listQuery.execute({ userId });
  }

  async countUnread(userId: string): Promise<number> {
    return this.countUnreadQuery.execute({ userId });
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationRow> {
    return this.markReadCommand.execute({ userId, notificationId });
  }

  async markAllRead(userId: string): Promise<NotificationRow[]> {
    return this.markAllReadCommand.execute({ userId });
  }
}
