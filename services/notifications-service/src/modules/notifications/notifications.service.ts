import { AppError } from '../../errors/AppError.js';
import type { NotificationRepository, NotificationRow } from '../../db/notification-repository.js';

export class NotificationsHttpService {
  constructor(private readonly notifications: NotificationRepository) {}

  listForUser(userId: string): Promise<NotificationRow[]> {
    return this.notifications.listForUser(userId);
  }

  async countUnread(userId: string): Promise<number> {
    return this.notifications.countUnread(userId);
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationRow> {
    const notification = await this.notifications.findByIdForUser(userId, notificationId);
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    if (notification.isRead) {
      return notification;
    }
    return this.notifications.markRead(notificationId);
  }

  async markAllRead(userId: string): Promise<NotificationRow[]> {
    await this.notifications.markAllReadForUser(userId);
    return this.notifications.listForUser(userId);
  }
}
