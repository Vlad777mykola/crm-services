import type { PoolClient } from 'pg';

import { NotificationRepository, NotificationType } from '../db/notification-repository.js';
import type { RecipientRepository } from '../db/recipient-repository.js';
import { logger } from '../logger.js';

export interface AnalyticsCompanyRatingUpdatedEnvelope {
  id: string;
  type: 'analytics.company_rating_updated';
  data: { companyId: string; averageRating: number; reviewCount: number };
}

export interface AnalyticsEventHandlerDeps {
  recipients: RecipientRepository;
  notifications: NotificationRepository;
}

export async function handleAnalyticsEvent(
  client: PoolClient,
  envelope: { id: string; type: string; data: Record<string, unknown> },
  deps: AnalyticsEventHandlerDeps,
): Promise<void> {
  if (envelope.type !== 'analytics.company_rating_updated') {
    logger.info({ type: envelope.type }, '[notifications-service] ignoring unrecognized analytics event');
    return;
  }

  const { companyId, averageRating, reviewCount } = envelope.data as AnalyticsCompanyRatingUpdatedEnvelope['data'];
  const managers = await deps.recipients.getCompanyManagerUsers(client, companyId);

  for (const manager of managers) {
    await deps.notifications.create(
      client,
      manager.userId,
      NotificationType.COMPANY_RATING_UPDATED,
      `Your average rating is now ${averageRating.toFixed(1)}`,
      `Based on ${reviewCount} review${reviewCount === 1 ? '' : 's'} so far, computed by the AI analytics service.`,
      { companyId, averageRating, reviewCount },
    );
  }

  logger.info({ companyId, averageRating, reviewCount }, '[notifications-service] recorded rating-updated notification');
}
