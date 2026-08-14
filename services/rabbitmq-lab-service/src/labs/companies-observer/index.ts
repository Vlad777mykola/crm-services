import type { Channel } from 'amqplib';

import { logger } from '../../logger.js';
import { bindEphemeralDomainObserver } from '../../rabbitmq/channel.js';
import { createHistory } from '../shared/history.js';

/**
 * Lesson 30 / LAB-08 - read-only observer of real `company.*` events on
 * `domain.events`. Uses its own exclusive auto-delete queue - never steals
 * from companies-service.q or any other CRM consumer queue.
 */
export interface ObservedCompanyEvent {
  eventId?: string;
  eventType?: string;
  routingKey: string;
  exchange: string;
  envelope: unknown;
}

const observed = createHistory<ObservedCompanyEvent>();
let observerQueue: string | null = null;

export async function initCompaniesObserverLab(ch: Channel): Promise<void> {
  observerQueue = await bindEphemeralDomainObserver(ch, 'company.*');
  await ch.prefetch(1);
  await ch.consume(observerQueue, (msg) => {
    if (!msg) return;
    try {
      const envelope = JSON.parse(msg.content.toString('utf8')) as { id?: string; type?: string };
      observed.record({
        eventId: envelope.id,
        eventType: envelope.type,
        routingKey: msg.fields.routingKey,
        exchange: msg.fields.exchange,
        envelope,
      });
      logger.info(
        { eventType: envelope.type, routingKey: msg.fields.routingKey },
        '[rabbitmq-lab-service] observed real company event (read-only)',
      );
      ch.ack(msg);
    } catch (err) {
      logger.error({ err }, '[rabbitmq-lab-service] companies observer failed');
      ch.nack(msg, false, false);
    }
  });
}

export function getCompaniesObserverState() {
  return {
    observerQueue,
    binding: { exchange: 'domain.events', routingKey: 'company.*' },
    observed: observed.list(),
  };
}
