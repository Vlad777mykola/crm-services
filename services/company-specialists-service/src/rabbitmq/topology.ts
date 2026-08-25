import type { Channel } from 'amqplib';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';
export const DOMAIN_EVENTS_DLX = 'domain.events.dlx';
export const COMPANY_SPECIALISTS_DEAD_QUEUE = 'company-specialists.dead.q';

export async function declareTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DOMAIN_EVENTS_DLX, 'topic', { durable: true });

  await channel.assertQueue(COMPANY_SPECIALISTS_DEAD_QUEUE, { durable: true });
  await channel.bindQueue(COMPANY_SPECIALISTS_DEAD_QUEUE, DOMAIN_EVENTS_DLX, '#');
}
