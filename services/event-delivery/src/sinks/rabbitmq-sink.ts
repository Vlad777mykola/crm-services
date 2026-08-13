import type { Channel } from 'amqplib';

import type { DeliveryReceipt, EventSink, OutboxDelivery, StoredEvent } from './event-sink.js';

const DOMAIN_EVENTS_EXCHANGE = 'domain.events';
const ANALYTICS_EVENTS_EXCHANGE = 'analytics.events';

const ROUTING: Record<string, { exchange: string; routingKey: string }> = {
  'domain.appointment.created': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.created' },
  'domain.auth.user_registered': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'auth.user_registered' },
  'analytics.ai.appointment_recommendation_created': {
    exchange: ANALYTICS_EVENTS_EXCHANGE,
    routingKey: 'ai.appointment_recommendation_created',
  },
};

export class RabbitMqSink implements EventSink {
  constructor(private readonly channel: Channel) {}

  async deliver(event: StoredEvent, delivery: OutboxDelivery): Promise<DeliveryReceipt> {
    const route = ROUTING[delivery.logicalDestination];
    if (!route) {
      throw new Error(`no RabbitMQ route for logical destination ${delivery.logicalDestination}`);
    }

    const envelope = {
      id: event.id,
      type: event.eventType,
      source: 'event-delivery',
      version: event.version,
      time: event.occurredAt.toISOString(),
      correlationId: event.correlationId,
      causationId: event.causationId,
      data: event.payload,
    };

    const published = this.channel.publish(route.exchange, route.routingKey, Buffer.from(JSON.stringify(envelope)), {
      contentType: 'application/json',
      persistent: true,
      mandatory: true,
      messageId: event.id,
    });
    if (!published) {
      throw new Error('RabbitMQ publish buffer full');
    }

    return { sink: 'rabbitmq', deliveryId: delivery.id, confirmedAt: new Date() };
  }
}
