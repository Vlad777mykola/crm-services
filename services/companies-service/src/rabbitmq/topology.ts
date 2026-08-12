import type { Channel } from 'amqplib';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';
export const ANALYTICS_EVENTS_EXCHANGE = 'analytics.events';
export const COMMANDS_EXCHANGE = 'commands';
export const DOMAIN_EVENTS_DLX = 'domain.events.dlx';
export const COMMANDS_DLX = 'commands.dlx';
export const COMPANIES_DEAD_QUEUE = 'companies.dead.q';

/**
 * Declares the exchanges and dead-letter topology this service depends on.
 * Every service that talks to RabbitMQ declares this same shape
 * independently (see docs/architecture/event-driven-model.md) instead of
 * importing a shared package, so each remains deployable on its own.
 * Idempotent - whichever service starts first "wins".
 */
export async function declareTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(ANALYTICS_EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(COMMANDS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DOMAIN_EVENTS_DLX, 'topic', { durable: true });
  await channel.assertExchange(COMMANDS_DLX, 'topic', { durable: true });

  await channel.assertQueue(COMPANIES_DEAD_QUEUE, { durable: true });
  await channel.bindQueue(COMPANIES_DEAD_QUEUE, DOMAIN_EVENTS_DLX, '#');
}
