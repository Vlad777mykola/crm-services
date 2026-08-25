import { AppError } from '../../../errors/AppError.js';
import type { NotificationRow } from '../../../db/entities/notification.entity.js';
import type {
  NotificationReadRepository,
  NotificationWriteRepository,
} from '../../ports/notification-repositories.js';
import type { MarkNotificationReadCommand } from './mark-notification-read.command.js';

export class MarkNotificationReadHandler {
  constructor(
    private readonly reads: NotificationReadRepository,
    private readonly writes: NotificationWriteRepository,
  ) {}

  async execute(command: MarkNotificationReadCommand): Promise<NotificationRow> {
    const notification = await this.reads.findByIdForUser(command.userId, command.notificationId);
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    if (notification.isRead) {
      return notification;
    }
    return this.writes.markRead(command.notificationId);
  }
}
