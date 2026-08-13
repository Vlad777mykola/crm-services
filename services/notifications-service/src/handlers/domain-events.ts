import type { PoolClient } from 'pg';

import type { EmailLogRepository } from '../db/email-log-repository.js';
import { NotificationRepository, NotificationType } from '../db/notification-repository.js';
import type { RecipientRepository } from '../db/recipient-repository.js';
import { buildEmailContent } from '../email/content.js';
import { resolveEmailRecipient } from '../email/recipients.js';
import { logger } from '../logger.js';
import type { WireEventEnvelope } from '../wire-event.js';

const NOTIFICATION_TYPE_BY_EVENT: Partial<Record<string, NotificationType>> = {
  'appointment.requested': NotificationType.APPOINTMENT_REQUESTED,
  'appointment.approved': NotificationType.APPOINTMENT_APPROVED,
  'appointment.rejected': NotificationType.APPOINTMENT_REJECTED,
  'appointment.cancelled': NotificationType.APPOINTMENT_CANCELLED,
  'appointment.completed': NotificationType.APPOINTMENT_COMPLETED,
  'review.received': NotificationType.REVIEW_RECEIVED,
};

export interface DomainEventHandlerDeps {
  recipients: RecipientRepository;
  notifications: NotificationRepository;
  emailLogs: EmailLogRepository;
}

/**
 * Real external SMTP MUST NOT run inside the consumer transaction. Email is
 * simulated via email_logs until a separate delivery worker exists.
 */
export async function handleDomainEvent(
  client: PoolClient,
  event: WireEventEnvelope,
  deps: DomainEventHandlerDeps,
): Promise<void> {
  const content = buildEmailContent(event);
  const recipientSpec = resolveEmailRecipient(event);
  const notificationType = NOTIFICATION_TYPE_BY_EVENT[event.type];

  if (!content || !recipientSpec || !notificationType) {
    logger.info({ type: event.type }, '[notifications-service] no handler mapping for this event type - ignoring');
    return;
  }

  const targets =
    recipientSpec.kind === 'user'
      ? [{ userId: recipientSpec.userId, email: await deps.recipients.getUserEmail(client, recipientSpec.userId) }]
      : await deps.recipients.getCompanyManagerUsers(client, recipientSpec.companyId);

  for (const target of targets) {
    await deps.notifications.create(client, target.userId, notificationType, content.subject, content.body, {
      eventType: event.type,
      eventId: event.id,
    });

    if (target.email) {
      await deps.emailLogs.record(client, {
        toEmail: target.email,
        subject: content.subject,
        body: content.body,
        eventType: event.type,
        eventId: event.id,
      });
      logger.info({ toEmail: target.email, subject: content.subject }, '[notifications-service] simulated email sent');
    }
  }
}
