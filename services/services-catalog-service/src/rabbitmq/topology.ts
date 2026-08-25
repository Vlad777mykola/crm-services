import type { Channel } from 'amqplib';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';
export const DOMAIN_EVENTS_DLX = 'domain.events.dlx';
export const SERVICES_CATALOG_DEAD_QUEUE = 'services-catalog.dead.q';

export async function declareTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DOMAIN_EVENTS_DLX, 'topic', { durable: true });

  await channel.assertQueue(SERVICES_CATALOG_DEAD_QUEUE, { durable: true });
  await channel.bindQueue(SERVICES_CATALOG_DEAD_QUEUE, DOMAIN_EVENTS_DLX, '#');
}
