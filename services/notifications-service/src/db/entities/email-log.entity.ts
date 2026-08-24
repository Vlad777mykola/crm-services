import { EntitySchema } from 'typeorm';

export interface EmailLogRow {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  eventType: string;
  eventId: string;
  createdAt: Date;
}

export const EmailLogEntity = new EntitySchema<EmailLogRow>({
  name: 'EmailLog',
  schema: 'notifications_schema',
  tableName: 'email_logs',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    toEmail: { type: String, length: 255 },
    subject: { type: String, length: 255 },
    body: { type: 'text' },
    eventType: { type: String, length: 100 },
    eventId: { type: 'uuid' },
    createdAt: { type: 'timestamptz', createDate: true },
  },
});
