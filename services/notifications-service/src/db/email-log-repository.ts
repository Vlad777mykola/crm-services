import type { Pool } from 'pg';

export interface EmailLogInput {
  toEmail: string;
  subject: string;
  body: string;
  eventType: string;
  eventId: string;
}

// Mirrors backend/src/modules/emails/email-log.entity.ts's table shape -
// this service is the logical owner of `email_logs`, see
// docs/architecture/service-ownership.md.
export class EmailLogRepository {
  constructor(private readonly pool: Pool) {}

  async record(input: EmailLogInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO "email_logs" ("toEmail", "subject", "body", "eventType", "eventId")
       VALUES ($1, $2, $3, $4, $5)`,
      [input.toEmail, input.subject, input.body, input.eventType, input.eventId],
    );
  }
}
