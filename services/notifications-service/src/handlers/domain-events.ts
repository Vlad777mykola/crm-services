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
 * Owns both side effects that used to be split across two places: the
 * in-app notification (previously created by backend's in-process
 * notification.subscriber.ts) and the simulated email log (previously
 * backend/src/workers/notifications.worker.ts). Now that this service is
 * the single owner, the backend gates its in-process subscriber off via
 * `IN_PROCESS_NOTIFICATIONS_ENABLED=false` to avoid duplicates - see
 * docs/architecture/service-ownership.md.
 */
export async function handleDomainEvent(event: WireEventEnvelope, deps: DomainEventHandlerDeps): Promise<void> {
  const content = buildEmailContent(event);
  const recipientSpec = resolveEmailRecipient(event);
  const notificationType = NOTIFICATION_TYPE_BY_EVENT[event.type];

  if (!content || !recipientSpec || !notificationType) {
    logger.info({ type: event.type }, '[notifications-service] no handler mapping for this event type - ignoring');
    return;
  }

  const targets =
    recipientSpec.kind === 'user'
      ? [{ userId: recipientSpec.userId, email: await deps.recipients.getUserEmail(recipientSpec.userId) }]
      : await deps.recipients.getCompanyManagerUsers(recipientSpec.companyId);

  for (const target of targets) {
    await deps.notifications.create(target.userId, notificationType, content.subject, content.body, {
      eventType: event.type,
      eventId: event.id,
    });

    if (target.email) {
      await deps.emailLogs.record({
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
