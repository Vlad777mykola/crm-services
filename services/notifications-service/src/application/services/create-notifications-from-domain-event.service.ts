import type { EntityManager } from 'typeorm';

import type { EmailLogRepository } from '../../db/email-log-repository.js';
import { NotificationType } from '../../db/notification-repository.js';
import type { RecipientRepository } from '../../db/recipient-repository.js';
import { buildEmailContent } from '../../email/content.js';
import { resolveEmailRecipient } from '../../email/recipients.js';
import { logger } from '../../logger.js';
import type { WireEventEnvelope } from '../../wire-event.js';
import type { NotificationWriteRepository } from '../ports/notification-repositories.js';

const NOTIFICATION_TYPE_BY_EVENT: Partial<Record<string, NotificationType>> = {
  'appointment.requested': NotificationType.APPOINTMENT_REQUESTED,
  'appointment.approved': NotificationType.APPOINTMENT_APPROVED,
  'appointment.rejected': NotificationType.APPOINTMENT_REJECTED,
  'appointment.rescheduled': NotificationType.APPOINTMENT_RESCHEDULED,
  'appointment.cancelled': NotificationType.APPOINTMENT_CANCELLED,
  'appointment.completed': NotificationType.APPOINTMENT_COMPLETED,
  'review.received': NotificationType.REVIEW_RECEIVED,
};

export interface CreateNotificationsFromDomainEventDeps {
  recipients: RecipientRepository;
  notifications: NotificationWriteRepository;
  emailLogs: EmailLogRepository;
}

export interface CreateNotificationsFromDomainEventInput {
  manager: EntityManager;
  event: WireEventEnvelope;
}

export class CreateNotificationsFromDomainEventService {
  constructor(private readonly deps: CreateNotificationsFromDomainEventDeps) {}

  async execute(input: CreateNotificationsFromDomainEventInput): Promise<void> {
    const content = buildEmailContent(input.event);
    const recipientSpec = resolveEmailRecipient(input.event);
    const notificationType = NOTIFICATION_TYPE_BY_EVENT[input.event.type];

    if (!content || !recipientSpec || !notificationType) {
      logger.info({ type: input.event.type }, '[notifications-service] no handler mapping for this event type - ignoring');
      return;
    }

    const targets =
      recipientSpec.kind === 'user'
        ? [
            {
              userId: recipientSpec.userId,
              email: await this.deps.recipients.getUserEmail(input.manager, recipientSpec.userId),
            },
          ]
        : await this.deps.recipients.getCompanyManagerUsers(input.manager, recipientSpec.companyId);

    for (const target of targets) {
      await this.deps.notifications.create(input.manager, target.userId, notificationType, content.subject, content.body, {
        eventType: input.event.type,
        eventId: input.event.id,
      });

      if (target.email) {
        await this.deps.emailLogs.record(input.manager, {
          toEmail: target.email,
          subject: content.subject,
          body: content.body,
          eventType: input.event.type,
          eventId: input.event.id,
        });
        logger.info({ toEmail: target.email, subject: content.subject }, '[notifications-service] simulated email sent');
      }
    }
  }
}
