import type { NotificationRow } from '../../../db/entities/notification.entity.js';
import type {
  NotificationReadRepository,
  NotificationWriteRepository,
} from '../../ports/notification-repositories.js';
import type { MarkAllNotificationsReadCommand } from './mark-all-notifications-read.command.js';

export class MarkAllNotificationsReadHandler {
  constructor(
    private readonly reads: NotificationReadRepository,
    private readonly writes: NotificationWriteRepository,
  ) {}

  async execute(command: MarkAllNotificationsReadCommand): Promise<NotificationRow[]> {
    await this.writes.markAllReadForUser(command.userId);
    return this.reads.listForUser(command.userId);
  }
}
