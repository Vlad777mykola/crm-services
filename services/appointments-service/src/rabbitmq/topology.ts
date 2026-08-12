import type { Channel } from 'amqplib';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';
export const ANALYTICS_EVENTS_EXCHANGE = 'analytics.events';
export const COMMANDS_EXCHANGE = 'commands';
export const DOMAIN_EVENTS_DLX = 'domain.events.dlx';
export const COMMANDS_DLX = 'commands.dlx';
export const APPOINTMENTS_DEAD_QUEUE = 'appointments.dead.q';

export async function declareTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(ANALYTICS_EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(COMMANDS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DOMAIN_EVENTS_DLX, 'topic', { durable: true });
  await channel.assertExchange(COMMANDS_DLX, 'topic', { durable: true });

  await channel.assertQueue(APPOINTMENTS_DEAD_QUEUE, { durable: true });
  await channel.bindQueue(APPOINTMENTS_DEAD_QUEUE, DOMAIN_EVENTS_DLX, '#');
}
