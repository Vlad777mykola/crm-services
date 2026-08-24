import { EntitySchema } from 'typeorm';

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  metadata: unknown | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export const NotificationEntity = new EntitySchema<NotificationRow>({
  name: 'Notification',
  schema: 'notifications_schema',
  tableName: 'notifications',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    userId: { type: 'uuid' },
    type: { type: String, length: 100 },
    title: { type: String, length: 255 },
    body: { type: 'text', nullable: true },
    metadata: { type: 'jsonb', nullable: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: 'timestamptz', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'IDX_notifications_userId', columns: ['userId'] },
    { name: 'IDX_notifications_isRead', columns: ['isRead'] },
  ],
});
