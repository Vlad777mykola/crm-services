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

/**
 * Handles results published by services/ai-service on the `analytics.events`
 * exchange. Unrecognized analytics event types are logged and ignored rather
 * than throwing, so a future addition to that exchange doesn't dead-letter
 * every message this service isn't ready to understand yet.
 */
export async function handleAnalyticsEvent(
  envelope: { id: string; type: string; data: Record<string, unknown> },
  deps: AnalyticsEventHandlerDeps,
): Promise<void> {
  if (envelope.type !== 'analytics.company_rating_updated') {
    logger.info({ type: envelope.type }, '[notifications-service] ignoring unrecognized analytics event');
    return;
  }

  const { companyId, averageRating, reviewCount } = envelope.data as AnalyticsCompanyRatingUpdatedEnvelope['data'];
  const managers = await deps.recipients.getCompanyManagerUsers(companyId);

  for (const manager of managers) {
    await deps.notifications.create(
      manager.userId,
      NotificationType.COMPANY_RATING_UPDATED,
      `Your average rating is now ${averageRating.toFixed(1)}`,
      `Based on ${reviewCount} review${reviewCount === 1 ? '' : 's'} so far, computed by the AI analytics service.`,
      { companyId, averageRating, reviewCount },
    );
  }

  logger.info({ companyId, averageRating, reviewCount }, '[notifications-service] recorded rating-updated notification');
}
