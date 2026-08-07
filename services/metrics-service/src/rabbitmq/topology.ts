import type { Channel } from 'amqplib';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';
export const ANALYTICS_EVENTS_EXCHANGE = 'analytics.events';
export const COMMANDS_EXCHANGE = 'commands';
export const DOMAIN_EVENTS_DLX = 'domain.events.dlx';
export const COMMANDS_DLX = 'commands.dlx';

/**
 * Declares the exchanges this service depends on. Every service that talks
 * to RabbitMQ declares this same shape independently (see
 * docs/architecture/event-driven-model.md) instead of importing a shared
 * package, so each remains deployable on its own. Idempotent - whichever
 * service starts first "wins". This service is observation-only and has no
 * dead-letter queue of its own: a dropped metrics message is not worth
 * inspecting later.
 */
export async function declareTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(ANALYTICS_EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(COMMANDS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DOMAIN_EVENTS_DLX, 'topic', { durable: true });
  await channel.assertExchange(COMMANDS_DLX, 'topic', { durable: true });
}
