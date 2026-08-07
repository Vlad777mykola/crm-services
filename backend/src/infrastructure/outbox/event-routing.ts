import type { DomainEventName } from '@/infrastructure/events/domain-events.js';

/**
 * Maps each domain event to the RabbitMQ exchange/routing key it should be
 * published under once services/outbox-publisher picks it up. Kept separate
 * from domain-events.ts (which only describes payload shapes) so adding a
 * new exchange later - e.g. routing some future event to `commands` instead
 * of `domain.events` - never requires touching business service code.
 */
export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

export const domainEventRouting: Record<DomainEventName, { exchange: string; routingKey: string }> = {
  'appointment.requested': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.requested' },
  'appointment.approved': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.approved' },
  'appointment.rejected': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.rejected' },
  'appointment.completed': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.completed' },
  'appointment.cancelled': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.cancelled' },
  'review.received': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'review.received' },
};
