import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { CompanyMember, CompanyMemberRole, CompanyMemberStatus } from '@/modules/company-members/company-member.entity.js';

import { Notification, type NotificationType } from './notification.entity.js';

function getNotificationRepository(): Repository<Notification> {
  return AppDataSource.getRepository(Notification);
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string | null = null,
  metadata: Record<string, unknown> | null = null,
): Promise<Notification> {
  const repository = getNotificationRepository();
  return repository.save(repository.create({ userId, type, title, body, metadata }));
}

/**
 * Fans a notification out to every active owner/manager of a company. Used by
 * other modules (e.g. appointments) to notify whoever can act on an event -
 * intentionally not company-role-checked here, since it's an internal helper
 * called from trusted service code after the caller's own permission checks.
 */
export async function notifyCompanyManagers(
  companyId: string,
  type: NotificationType,
  title: string,
  body: string | null = null,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  const members = await AppDataSource.getRepository(CompanyMember).find({
    where: { companyId, status: CompanyMemberStatus.ACTIVE, role: CompanyMemberRole.OWNER },
  });
  const managers = await AppDataSource.getRepository(CompanyMember).find({
    where: { companyId, status: CompanyMemberStatus.ACTIVE, role: CompanyMemberRole.MANAGER },
  });

  const repository = getNotificationRepository();
  const recipients = [...members, ...managers];
  await repository.save(
    recipients.map((member) => repository.create({ userId: member.userId, type, title, body, metadata })),
  );
}

export async function listMyNotifications(userId: string): Promise<Notification[]> {
  const repository = getNotificationRepository();
  return repository.find({ where: { userId }, order: { createdAt: 'DESC' } });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const repository = getNotificationRepository();
  return repository.count({ where: { userId, isRead: false } });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<Notification> {
  const repository = getNotificationRepository();
  const notification = await repository.findOne({ where: { id: notificationId, userId } });
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await repository.save(notification);
  }

  return notification;
}

export async function markAllNotificationsRead(userId: string): Promise<Notification[]> {
  const repository = getNotificationRepository();
  await repository.update({ userId, isRead: false }, { isRead: true, readAt: new Date() });
  return listMyNotifications(userId);
}
