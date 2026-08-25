import type { EntityManager } from 'typeorm';

import { NotificationType } from '../../db/notification-repository.js';
import type { RecipientRepository } from '../../db/recipient-repository.js';
import { logger } from '../../logger.js';
import type { NotificationWriteRepository } from '../ports/notification-repositories.js';

export interface AnalyticsCompanyRatingUpdatedEnvelope {
  id: string;
  type: 'analytics.company_rating_updated';
  data: { companyId: string; averageRating: number; reviewCount: number };
}

export interface CreateNotificationsFromAnalyticsEventDeps {
  recipients: RecipientRepository;
  notifications: NotificationWriteRepository;
}

export interface CreateNotificationsFromAnalyticsEventInput {
  manager: EntityManager;
  envelope: { id: string; type: string; data: Record<string, unknown> };
}

export class CreateNotificationsFromAnalyticsEventService {
  constructor(private readonly deps: CreateNotificationsFromAnalyticsEventDeps) {}

  async execute(input: CreateNotificationsFromAnalyticsEventInput): Promise<void> {
    if (input.envelope.type !== 'analytics.company_rating_updated') {
      logger.info({ type: input.envelope.type }, '[notifications-service] ignoring unrecognized analytics event');
      return;
    }

    const { companyId, averageRating, reviewCount } = input.envelope
      .data as AnalyticsCompanyRatingUpdatedEnvelope['data'];
    const managers = await this.deps.recipients.getCompanyManagerUsers(input.manager, companyId);

    for (const recipient of managers) {
      await this.deps.notifications.create(
        input.manager,
        recipient.userId,
        NotificationType.COMPANY_RATING_UPDATED,
        `Your average rating is now ${averageRating.toFixed(1)}`,
        `Based on ${reviewCount} review${reviewCount === 1 ? '' : 's'} so far, computed by the AI analytics service.`,
        { companyId, averageRating, reviewCount },
      );
    }

    logger.info({ companyId, averageRating, reviewCount }, '[notifications-service] recorded rating-updated notification');
  }
}
