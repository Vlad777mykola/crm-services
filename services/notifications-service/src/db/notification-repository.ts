import type { DataSource, EntityManager } from 'typeorm';

import { NotificationEntity, type NotificationRow } from './entities/notification.entity.js';

// Mirrors backend/src/modules/notifications/notification.entity.ts's enum -
// duplicated deliberately, not imported, so this service never depends on
// backend source.
export enum NotificationType {
  APPOINTMENT_REQUESTED = 'appointment.requested',
  APPOINTMENT_APPROVED = 'appointment.approved',
  APPOINTMENT_REJECTED = 'appointment.rejected',
  APPOINTMENT_RESCHEDULED = 'appointment.rescheduled',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  REVIEW_RECEIVED = 'review.received',
  COMPANY_RATING_UPDATED = 'company.rating_updated',
}

export type { NotificationRow } from './entities/notification.entity.js';

export class NotificationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(
    manager: EntityManager,
    userId: string,
    type: NotificationType,
    title: string,
    body: string | null,
    metadata: Record<string, unknown> | null,
  ): Promise<void> {
    const repository = manager.getRepository(NotificationEntity);
    await repository.save(repository.create({ userId, type, title, body, metadata }));
  }

  async listForUser(userId: string): Promise<NotificationRow[]> {
    return this.dataSource.getRepository(NotificationEntity).find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.dataSource.getRepository(NotificationEntity).count({ where: { userId, isRead: false } });
  }

  async findByIdForUser(userId: string, notificationId: string): Promise<NotificationRow | null> {
    return this.dataSource.getRepository(NotificationEntity).findOne({ where: { id: notificationId, userId } });
  }

  async markRead(notificationId: string): Promise<NotificationRow> {
    const repository = this.dataSource.getRepository(NotificationEntity);
    await repository.update({ id: notificationId }, { isRead: true, readAt: new Date() });
    return repository.findOneByOrFail({ id: notificationId });
  }

  async markAllReadForUser(userId: string): Promise<void> {
    await this.dataSource
      .getRepository(NotificationEntity)
      .createQueryBuilder()
      .update()
      .set({ isRead: true, readAt: new Date() })
      .where('"userId" = :userId', { userId })
      .andWhere('"isRead" = false')
      .execute();
  }
}
