import type { EntityManager } from 'typeorm';

import { EmailLogEntity } from './entities/email-log.entity.js';

export interface EmailLogInput {
  toEmail: string;
  subject: string;
  body: string;
  eventType: string;
  eventId: string;
}

// Mirrors backend/src/modules/emails/email-log.entity.ts's table shape -
// this service is the logical owner of `email_logs`.
export class EmailLogRepository {
  async record(manager: EntityManager, input: EmailLogInput): Promise<void> {
    await manager.getRepository(EmailLogEntity).insert(input);
  }
}
