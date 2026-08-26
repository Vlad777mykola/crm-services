import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

// Reuses the existing v1 schemas as-is (Task 9.5) - payload shapes unchanged
// from when legacy-backend published these.
export type AppointmentDomainEventName =
  | 'appointment.requested'
  | 'appointment.approved'
  | 'appointment.rejected'
  | 'appointment.completed'
  | 'appointment.review_eligible'
  | 'appointment.rescheduled'
  | 'appointment.cancelled';

export const appointmentEventRouting: Record<AppointmentDomainEventName, { exchange: string; routingKey: string }> = {
  'appointment.requested': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.requested' },
  'appointment.approved': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.approved' },
  'appointment.rejected': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.rejected' },
  'appointment.completed': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.completed' },
  'appointment.review_eligible': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.review_eligible' },
  'appointment.rescheduled': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.rescheduled' },
  'appointment.cancelled': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.cancelled' },
};

export interface RecordOutboxEventInput {
  type: AppointmentDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
  correlationId?: string | null;
  causationId?: string | null;
}

export async function recordOutboxEvent(manager: EntityManager, input: RecordOutboxEventInput): Promise<void> {
  const routing = appointmentEventRouting[input.type];
  const repository = manager.getRepository(OutboxEventEntity);
  await repository.save(
    repository.create({
      eventType: input.type,
      exchange: routing.exchange,
      routingKey: routing.routingKey,
      aggregateType: 'appointment',
      aggregateId: input.aggregateId,
      payload: input.payload,
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
    }),
  );
}
