import type { EntityManager } from 'typeorm';

import type { NotificationRow } from '../../db/entities/notification.entity.js';
import type { NotificationType } from '../../db/notification-repository.js';

export interface NotificationReadRepository {
  listForUser(userId: string): Promise<NotificationRow[]>;
  countUnread(userId: string): Promise<number>;
  findByIdForUser(userId: string, notificationId: string): Promise<NotificationRow | null>;
}

export interface NotificationWriteRepository {
  create(
    manager: EntityManager,
    userId: string,
    type: NotificationType,
    title: string,
    body: string | null,
    metadata: Record<string, unknown> | null,
  ): Promise<void>;
  markRead(notificationId: string): Promise<NotificationRow>;
  markAllReadForUser(userId: string): Promise<void>;
}
