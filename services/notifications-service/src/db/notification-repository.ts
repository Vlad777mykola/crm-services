import type { Pool, PoolClient } from 'pg';

// Mirrors backend/src/modules/notifications/notification.entity.ts's enum -
// duplicated deliberately, not imported, so this service never depends on
// backend source. This service is the logical owner of the `notifications`
// table (see docs/architecture/service-ownership.md); the backend API may
// only read it.
export enum NotificationType {
  APPOINTMENT_REQUESTED = 'appointment.requested',
  APPOINTMENT_APPROVED = 'appointment.approved',
  APPOINTMENT_REJECTED = 'appointment.rejected',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  REVIEW_RECEIVED = 'review.received',
  COMPANY_RATING_UPDATED = 'company.rating_updated',
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export class NotificationRepository {
  constructor(private readonly pool: Pool) {}

  async create(
    client: PoolClient,
    userId: string,
    type: NotificationType,
    title: string,
    body: string | null,
    metadata: Record<string, unknown> | null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO notifications_schema.notifications ("userId", "type", "title", "body", "metadata")
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, metadata ? JSON.stringify(metadata) : null],
    );
  }

  async listForUser(userId: string): Promise<NotificationRow[]> {
    const { rows } = await this.pool.query<NotificationRow>(
      `SELECT * FROM notifications_schema.notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [userId],
    );
    return rows;
  }

  async countUnread(userId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM notifications_schema.notifications WHERE "userId" = $1 AND "isRead" = false`,
      [userId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async findByIdForUser(userId: string, notificationId: string): Promise<NotificationRow | undefined> {
    const { rows } = await this.pool.query<NotificationRow>(
      `SELECT * FROM notifications_schema.notifications WHERE "id" = $1 AND "userId" = $2`,
      [notificationId, userId],
    );
    return rows[0];
  }

  async markRead(notificationId: string): Promise<NotificationRow> {
    const { rows } = await this.pool.query<NotificationRow>(
      `UPDATE notifications_schema.notifications SET "isRead" = true, "readAt" = now() WHERE "id" = $1 RETURNING *`,
      [notificationId],
    );
    return rows[0];
  }

  async markAllReadForUser(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE notifications_schema.notifications SET "isRead" = true, "readAt" = now() WHERE "userId" = $1 AND "isRead" = false`,
      [userId],
    );
  }
}
