import type { Pool } from 'pg';

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

export class NotificationRepository {
  constructor(private readonly pool: Pool) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string | null,
    metadata: Record<string, unknown> | null,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO "notifications" ("userId", "type", "title", "body", "metadata")
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, metadata ? JSON.stringify(metadata) : null],
    );
  }
}
