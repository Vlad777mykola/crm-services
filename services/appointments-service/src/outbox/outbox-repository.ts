import type { PoolClient } from 'pg';

export const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

// Reuses the existing v1 schemas as-is (Task 9.5) - payload shapes unchanged
// from when legacy-backend published these.
export type AppointmentDomainEventName =
  | 'appointment.requested'
  | 'appointment.approved'
  | 'appointment.rejected'
  | 'appointment.completed'
  | 'appointment.cancelled';

export const appointmentEventRouting: Record<AppointmentDomainEventName, { exchange: string; routingKey: string }> = {
  'appointment.requested': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.requested' },
  'appointment.approved': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.approved' },
  'appointment.rejected': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.rejected' },
  'appointment.completed': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.completed' },
  'appointment.cancelled': { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.cancelled' },
};

export interface RecordOutboxEventInput {
  type: AppointmentDomainEventName;
  payload: Record<string, unknown>;
  aggregateId: string;
}

export async function recordOutboxEvent(client: PoolClient, input: RecordOutboxEventInput): Promise<void> {
  const routing = appointmentEventRouting[input.type];
  await client.query(
    `INSERT INTO appointments_schema.outbox_events
       ("eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.type, routing.exchange, routing.routingKey, 'appointment', input.aggregateId, input.payload],
  );
}
